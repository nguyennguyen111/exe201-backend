import PayOS from '@payos/node'
import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment'
import Package from '~/models/Package'
import Transaction from '~/models/Transaction'
import StudentPackage from '~/models/StudentPackage'
import UserMetric from '~/models/UserMetric'
import PTWallet from '~/models/PTWallet'
import PTWalletTransaction from '~/models/PTWalletTransaction'

// Khởi tạo SDK PayOS
const payOS = new PayOS(env.PAYOS_CLIENT_ID, env.PAYOS_API_KEY, env.PAYOS_CHECKSUM_KEY)

// Helper: cộng tiền vào ví PT + ghi lịch sử
async function creditPTWallet({ ptId, ptEarning, transactionId }) {
  await PTWallet.findOneAndUpdate(
    { pt: ptId },
    { $inc: { balance: ptEarning } },
    { upsert: true, new: true }
  )
  await PTWalletTransaction.create({
    pt: ptId,
    type: 'earning',
    amount: ptEarning,
    refId: transactionId,
    refType: 'Transaction',
    status: 'completed'
  })
}

/**
 * 1) Student bấm “Mua” gói → tạo Transaction trạng thái 'initiated'
 * POST /api/student/packages/:packageId/checkout/init
 */
const initTransaction = async (req, res) => {
  try {
    const studentId = req.user._id
    const { packageId } = req.params

    const pkg = await Package.findById(packageId).populate('pt', 'name')
    if (!pkg || !pkg.isActive) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Gói không khả dụng' })
    }
    if (pkg.visibility === 'private') {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Gói này không bán công khai' })
    }

    const trans = await Transaction.create({
      student: studentId,
      pt: pkg.pt._id,
      package: pkg._id,
      amount: pkg.price || 0,
      method: 'payos',
      status: 'initiated'
    })

    return res.status(StatusCodes.CREATED).json({
      success: true,
      data: {
        transactionId: trans._id,
        status: trans.status,
        package: {
          id: pkg._id,
          name: pkg.name,
          ptName: pkg.pt.name,
          price: pkg.price,
          totalSessions: pkg.totalSessions,
          durationDays: pkg.durationDays
        }
      }
    })
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message })
  }
}

/**
 * 2) Student đồng ý điều khoản → tạo link PayOS (QR)
 * POST /api/student/transactions/:transactionId/pay
 * → set status = 'pending_gateway'
 */
const createPaymentLink = async (req, res) => {
  try {
    const { transactionId } = req.params;

    // 1) Lấy transaction và kiểm tra trạng thái
    const trans = await Transaction.findById(transactionId).populate('package');
    if (!trans) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
    }
    if (trans.status !== 'initiated') {
      return res.status(400).json({ success: false, message: 'Trạng thái giao dịch không hợp lệ (phải là initiated)' });
    }

    // 2) Chuẩn hoá dữ liệu
    const amount = Number.parseInt(trans.amount, 10) || 0;
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ (phải là số nguyên VND > 0)' });
    }

    // PayOS yêu cầu Number cho orderCode
    const orderCode = Number(String(Date.now()).slice(-10));
    const CLIENT_URL = (process.env.CLIENT_URL || (env && env.CLIENT_URL) || 'http://localhost:5173').replace(/\/$/, '');

    const name = (trans.package?.name ?? '').toString().trim() || 'Gói tập PT';
    const description = `${name}`; // luôn là string

    // items phải là array và mỗi item có name/quantity/price number
    const items = [{
      name,
      quantity: 1,
      price: amount
    }];

    // returnUrl & cancelUrl phải là string hợp lệ
    const returnUrl = `${CLIENT_URL}/payment/result?payment=success&orderCode=${orderCode}`;
    const cancelUrl = `${CLIENT_URL}/payment/result?payment=cancelled&orderCode=${orderCode}`;

    const paymentData = {
      orderCode,
      amount,
      description,
      items,
      returnUrl,
      cancelUrl
    };

    // 3) Log chẩn đoán chi tiết
    console.log('[PayOS] Will createPaymentLink with:', {
      orderCode: paymentData.orderCode,
      amount: paymentData.amount,
      description: paymentData.description,
      items: paymentData.items,
      returnUrl: paymentData.returnUrl,
      cancelUrl: paymentData.cancelUrl
    });

    // 4) Gọi PayOS
    let link;
    try {
      link = await payOS.createPaymentLink(paymentData);
    } catch (err) {
      console.error('=== PayOS ERROR RAW ===');
      console.error(err?.response?.data || err?.message || err);
      console.error('=======================');

      const msg =
        err?.response?.data?.description ||
        err?.response?.data?.message ||
        err?.message ||
        'Không tạo được link thanh toán';

      return res.status(500).json({ success: false, message: msg });
    }

    // 5) Cập nhật transaction
    trans.status = 'pending_gateway';
    trans.payosOrderCode = orderCode;
    trans.payosCheckoutUrl = link.checkoutUrl;
    trans.checkoutUrl = link.checkoutUrl;
    await trans.save();

    return res.status(200).json({
      success: true,
      data: {
        transactionId: trans._id,
        orderCode,
        checkoutUrl: link.checkoutUrl,
        status: trans.status
      }
    });
  } catch (error) {
    console.error('[createPaymentLink] error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3) FE confirm sau redirect (?payment=success&orderCode=...)
 * POST /api/student/payment/confirm  { orderCode }
 * → verify PayOS → set 'paid' → tạo StudentPackage → cộng ví PT
 */
const confirmPayment = async (req, res) => {
  try {
    const { orderCode } = req.body
    if (!orderCode) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'orderCode là bắt buộc' })
    }

    // tìm theo orderCode, KHÔNG ràng buộc status
    const trans = await Transaction
      .findOne({ payosOrderCode: Number(orderCode) })
      .populate('package student pt')

    if (!trans) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy giao dịch' })
    }

    // idempotent
    if (trans.status === 'paid') {
      return res.status(StatusCodes.OK).json({ success: true, data: { status: 'paid' } })
    }

    // verify với PayOS
    const info = await payOS.getPaymentLinkInformation(Number(orderCode))
    const status = String(info?.status || '').toUpperCase()

    if (status !== 'PAID') {
      // nếu bị hủy, cập nhật lại cho đúng
      if (status === 'CANCELLED') {
        await Transaction.updateOne({ _id: trans._id }, { $set: { status: 'cancelled' } })
        return res.status(StatusCodes.OK).json({ success: true, data: { status: 'cancelled' } })
      }
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Thanh toán chưa được PayOS xác nhận' })
    }

    // đã thanh toán
    // tính fee
    const platformPercent = Number(env.PLATFORM_FEE_PERCENT ?? 20)
    const platformFee = Math.floor(trans.amount * platformPercent / 100)
    const ptEarning = trans.amount - platformFee

    // cập nhật trans
    trans.status = 'paid'
    trans.paidAt = new Date()
    trans.platformFee = platformFee
    trans.ptEarning = ptEarning
    // lấy transactionId từ PayOS nếu có
    const txId = info?.transactions?.[0]?.transactionId
    if (txId) trans.gatewayTxnId = txId
    await trans.save()

    // CHỐNG TẠO TRÙNG StudentPackage: check đã tồn tại theo transaction
    const existedSP = await StudentPackage.findOne({ transaction: trans._id }).lean()
    if (!existedSP) {
      const pkg = trans.package
      const start = new Date()
      const end = new Date(start.getTime() + (pkg.durationDays || 30) * 86400000)

      const lastMetric = await UserMetric.findOne({ user: trans.student._id }).sort({ createdAt: -1 }).lean()
      const baselineMetric = lastMetric ? {
        heightCm: lastMetric.heightCm,
        weightKg: lastMetric.weightKg,
        bmi: lastMetric.bmi,
        bmr: lastMetric.bmr,
        tdee: lastMetric.tdee,
        activity: lastMetric.activity,
        goal: lastMetric.goal
      } : undefined

      await StudentPackage.create({
        student: trans.student._id,
        pt: trans.pt._id,
        package: pkg._id,
        transaction: trans._id,
        startDate: start,
        endDate: end,
        totalSessions: pkg.totalSessions,
        remainingSessions: pkg.totalSessions,
        status: 'active',
        isExternal: false,
        createdByPT: false,
        baselineMetric,
        baselineMetricAt: baselineMetric ? lastMetric.createdAt : undefined
      })
    }

    // Cộng ví PT (idempotent: nếu lo trùng, có thể tạo unique key ở PTWalletTransaction hoặc check trước)
    await creditPTWallet({ ptId: trans.pt._id, ptEarning, transactionId: trans._id })

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Thanh toán thành công',
      data: { transactionId: trans._id, status: 'paid' }
    })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message })
  }
}


/**
 * (tuỳ chọn) Polling trạng thái
 * GET /api/student/transactions/:transactionId
 */
const getTransactionStatus = async (req, res) => {
  try {
    const { transactionId } = req.params
    const trans = await Transaction.findById(transactionId).select('status payosOrderCode')
    if (!trans) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy' })
    return res.status(StatusCodes.OK).json({ success: true, data: { status: trans.status } })
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message })
  }
}

export const checkoutPTController = {
    initTransaction,
    createPaymentLink,
    confirmPayment,
    getTransactionStatus
}
