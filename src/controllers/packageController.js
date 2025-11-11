// src/controllers/packageController.js
import { StatusCodes } from 'http-status-codes'
import Package from '~/models/Package'
import StudentPackage from '~/models/StudentPackage'
import PTMaterial from '~/models/PTMaterial.js'


// Mon-first ordering: 1..6..0(CN)
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

// helper: normalize patterns [[...], ...] -> chuẩn 0..6 và sắp theo Mon-first
function normalizePatterns(input) {
  let patterns = input;
  if (Array.isArray(patterns) && patterns.length && typeof patterns[0] === 'number') {
    // [1,3,5] -> [[1,3,5]]
    patterns = [patterns];
  }
  if (!Array.isArray(patterns)) return [];

  return patterns
    .map((p) => {
      const cleaned = Array.from(
        new Set((Array.isArray(p) ? p : [])
          .map(Number)
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))
      );
      // sort Mon-first: 1..6..0
      cleaned.sort((a, b) => MON_FIRST.indexOf(a) - MON_FIRST.indexOf(b));
      return cleaned;
    })
    .filter((p) => p.length > 0);
}

// PT tạo gói mới
const createPackage = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      totalSessions,
      sessionDurationMin,   // bắt buộc
      durationDays,
      visibility,
      tags,
      supports,
      travelPricing,
      recurrence // { daysOfWeek: [[...], ...] } hoặc daysOfWeek: [1,3,5]
    } = req.body;

    if (!name || !totalSessions || !sessionDurationMin || !durationDays) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ: tên gói, số buổi, thời lượng mỗi buổi (phút), thời hạn (ngày)'
      });
    }

    let daysPatterns = [];
    if (recurrence?.daysOfWeek) {
      daysPatterns = normalizePatterns(recurrence.daysOfWeek);
    }

    const payload = {
      pt: req.user?._id,
      name: String(name).trim(),
      description: description ?? '',
      price: Math.max(0, Math.round(price ?? 0)),
      totalSessions: Number(totalSessions),
      sessionDurationMin: Number(sessionDurationMin),
      durationDays: Number(durationDays),
      isActive: typeof req.body.isActive === 'boolean' ? req.body.isActive : true,
      visibility: visibility || 'private',
      tags: Array.isArray(tags) ? tags : []
    };

    // optional
    if (supports && typeof supports === 'object') payload.supports = supports;
    if (travelPricing && typeof travelPricing === 'object') payload.travelPricing = travelPricing;
    if (daysPatterns.length) payload.recurrence = { daysOfWeek: daysPatterns };

    const pkg = await Package.create(payload);

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tạo gói tập thành công',
      data: pkg
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Tên gói đã tồn tại trong tài khoản PT'
      });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// PT xem danh sách gói của mình
const getMyPackages = async (req, res) => {
  try {
    const { isActive, page = '1', limit = '10' } = req.query;
    const _page = Math.max(1, parseInt(page, 10) || 1);
    const _limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const filter = { pt: req.user?._id };
    if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';

    const [items, total] = await Promise.all([
      Package.find(filter).sort({ createdAt: -1 }).limit(_limit).skip((_page - 1) * _limit),
      Package.countDocuments(filter)
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      data: items,
      pagination: { total, page: _page, pages: Math.ceil(total / _limit) }
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// Public: Student xem danh sách gói của 1 PT
const getPackagesByPTPublic = async (req, res) => {
  try {
    const { ptId } = req.params;
    const items = await Package.find({ pt: ptId, isActive: true }).sort({ createdAt: -1 });
    return res.status(StatusCodes.OK).json({ success: true, data: items });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// Xem chi tiết một gói
const getPackageById = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id)
      .populate('pt', 'name avatar')
      .lean(); // dùng lean để thêm trường tùy chỉnh

    if (!pkg) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy gói tập',
      });
    }

    const isOwner = req.user && String(pkg.pt._id) === String(req.user._id);
    const isPublic = pkg.visibility === 'public';
    if (!isOwner && !isPublic) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Bạn không có quyền xem gói này',
      });
    }

    // 🔍 Truy vấn ngược tất cả materials có sharedWithPackages chứa id này
    const materials = await PTMaterial.find({
      sharedWithPackages: pkg._id,
    })
      .select('title name type url updatedAt createdAt')
      .lean();

    // 🔗 Gắn thêm vào pkg
    pkg.materials = materials || [];

    return res.status(StatusCodes.OK).json({ success: true, data: pkg });
  } catch (error) {
    console.error('❌ getPackageById error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi server',
      error: error.message,
    });
  }
};


// PT cập nhật gói của mình
const updatePackage = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy gói tập' });
    }
    if (String(pkg.pt) !== String(req.user._id)) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Bạn không có quyền sửa gói này' });
    }

    const allowedFields = [
      'name',
      'description',
      'price',
      'totalSessions',
      'sessionDurationMin',
      'durationDays',
      'isActive',
      'visibility',
      'tags',
      'supports',
      'travelPricing'
    ];

    for (const f of allowedFields) {
      if (typeof req.body[f] !== 'undefined') pkg[f] = req.body[f];
    }

    // recurrence (patterns) nếu có gửi lên
    if (req.body?.recurrence?.daysOfWeek) {
      const patterns = normalizePatterns(req.body.recurrence.daysOfWeek);
      pkg.recurrence = patterns.length ? { daysOfWeek: patterns } : { daysOfWeek: [] };
    }

    await pkg.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật gói thành công',
      data: pkg
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({ success: false, message: 'Tên gói đã tồn tại trong tài khoản PT' });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// Ẩn gói
const deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy gói tập' });
    }
    if (String(pkg.pt) !== String(req.user._id)) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Bạn không có quyền ẩn gói này' });
    }

    const activeCount = await StudentPackage.countDocuments({ package: pkg._id, status: 'active' });
    if (activeCount > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Không thể ẩn gói này vì đang có ${activeCount} học viên sử dụng`
      });
    }

    pkg.isActive = false;
    await pkg.save();
    return res.status(StatusCodes.OK).json({ success: true, message: 'Đã ẩn gói tập thành công' });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// Xoá hẳn gói
const hardDeletePackage = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy gói tập' });
    }
    if (String(pkg.pt) !== String(req.user._id)) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Bạn không có quyền xoá gói này' });
    }

    const usedCount = await StudentPackage.countDocuments({ package: pkg._id });
    if (usedCount > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Không thể xoá gói đã có học viên sử dụng' });
    }

    await pkg.deleteOne();
    return res.status(StatusCodes.OK).json({ success: true, message: 'Đã xoá gói tập vĩnh viễn' });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const packageController = {
  createPackage,
  getMyPackages,
  getPackagesByPTPublic,
  getPackageById,
  updatePackage,
  deletePackage,
  hardDeletePackage
};
