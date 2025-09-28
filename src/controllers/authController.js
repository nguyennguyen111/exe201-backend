import bcrypt from 'bcrypt'
import User from '~/models/User'
import { StatusCodes } from 'http-status-codes'
import { genarateAccessToken } from '~/utils/genarateTokens'
import { sendResetPasswordEmail } from '../utils/mailer'
import { generateResetToken } from '../utils/genarateTokens'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { env } from '~/config/environment'

const client = new OAuth2Client(env.GG_CLIENT_ID)

const loginWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body
    if (!idToken) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Thiếu idToken' })
    }

    // Verify token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GG_CLIENT_ID
    })
    const payload = ticket.getPayload()
    console.log('payload: ', payload)

    // payload chứa: email, name, picture, sub (unique Google user id)
    const { email, name, picture, sub } = payload

    // Tìm user trong DB
    let user = await User.findOne({ email })
    if (!user) {
      // Nếu chưa có thì tạo mới
      user = new User({
        email,
        name,
        avatar: picture,
        phone: '', // Google không trả phone
        password: '', // không cần password
        isActive: true,
        role: 'customer',
        googleId: sub
      })
      await user.save()
    }

    // Kiểm tra tài khoản bị khóa
    if (!user.isActive) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Tài khoản đã bị khóa' })
    }

    // Payload để generate token
    const jwtPayload = {
      _id: user._id,
      role: user.role,
      email: user.email,
      name: user.name,
      avatar: user.avatar
    }

    const accessToken = genarateAccessToken(jwtPayload)

    // Set cookie HttpOnly
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: false, // true nếu deploy https
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    })

    res.json({ message: 'Google login successful', user: jwtPayload })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Google login failed', error: err.message })
  }
}

const registerByPhone = async (req, res) => {
  try {
    const { phone, password, name, email } = req.body

    const existingUser = await User.findOne({ phone })
    if (existingUser) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Số điện thoại đã được đăng ký' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = new User({ phone, password: hashedPassword, name, email })
    await newUser.save()

    res.status(201).json({ message: 'Tạo tài khoản thành công' })
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message })
  }
}

const login = async (req, res) => {
  const { phone, password } = req.body

  const currentUser = await User.findOne({ phone })


  if (!currentUser) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'Số điện thoại chua đăng ký' })
  }
  if (!currentUser.isActive) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: 'Tài khoản của bạn đã bị khóa' })
  }

  if (!(await bcrypt.compare(password, currentUser.password))) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Sai MK' })
  }

  if (currentUser.isActive === false) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: 'Tài khoản của bạn đã bị khóa' })
  }

  const payload = {
    _id: currentUser._id,
    role: currentUser.role,
    phone: currentUser.phone,
    name: currentUser.name,
    avatar: currentUser.avatar,
    email: currentUser.email
  }

  const accessToken = genarateAccessToken(payload)

  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: false, // nếu dùng HTTPS thì để true
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 ngày
  })
  res.json({ message: 'Login successful' })
}

const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false // nếu dùng HTTPS thì để true
  })

  res.status(200).json({ message: 'Logged out successfully' })

}

const forgotPassword = async (req, res) => {
  const { phone } = req.body

  try {
    const user = await User.findOne({ phone, role: 'customer' })

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' })
    }

    if (!user.email) {
      return res.status(404).json({ message: 'Không tìm thấy email của người dùng' })
    }

    const { token, expires } = generateResetToken()
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    user.resetPasswordToken = hashedToken
    user.resetTokenExpires = expires
    await user.save()

    const resetLink = `http://localhost:5173/reset-password/${token}`
    console.log(`Reset link: ${resetLink}`)

    await sendResetPasswordEmail(user.email, user.name || 'bạn', resetLink)

    return res.status(200).json({ message: 'Đã gửi link đặt lại mật khẩu đến email!' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Lỗi server' })
  }
}

const resetPassword = async (req, res) => {
  const { token } = req.params
  const { password, confirmPassword } = req.body

  // 1. Kiểm tra đầy đủ thông tin
  if (!password || !confirmPassword) {
    return res.status(400).json({ message: 'Vui lòng nhập đủ thông tin.' })
  }

  // 2. Kiểm tra 2 password có giống nhau không
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Mật khẩu không khớp.' })
  }

  // 3. Tìm user theo hashed token và kiểm tra thời hạn
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetTokenExpires: { $gt: Date.now() }
  })

  if (!user) {
    return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  // 4. Lưu mật khẩu mới (hash nếu cần)
  user.password = hashedPassword
  user.resetPasswordToken = undefined
  user.resetTokenExpires = undefined
  await user.save()

  return res.json({ message: 'Mật khẩu đã được cập nhật thành công!' })
}

export const authController = {
  registerByPhone,
  login,
  logout,
  forgotPassword,
  resetPassword,
  loginWithGoogle
}
