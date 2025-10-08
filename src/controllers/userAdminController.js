import User from '../models/User.js';
import { StatusCodes } from 'http-status-codes';

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    res.status(200).json(users);
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Lỗi server' });
  }
};

const blockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Không tìm thấy người dùng' });
    res.json({ message: 'Đã khóa người dùng', user });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Lỗi server' });
  }
};

const unlockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Không tìm thấy người dùng' });
    res.json({ message: 'Đã mở khóa người dùng', user });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Lỗi server' });
  }
};

const countCustomers = async (req, res) => {
  try {
    const totalCustomers = await User.countDocuments({ role: 'student' });
    res.status(StatusCodes.OK).json({
      success: true,
      totalCustomers
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Lỗi server' });
  }
};

export const userAdminController = {
  getAllUsers,
  blockUser,
  unlockUser,
  countCustomers
};
