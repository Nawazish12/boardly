import * as authService from "../services/authService.js";
import { catchAsync } from "../utils/catchAsync.js";

export const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;
  const result = await authService.registerUser({ name, email, password });

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: result,
  });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser({ email, password });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: result,
  });
});

export const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshTokens(refreshToken);

  res.status(200).json({
    success: true,
    message: "Token refreshed",
    data: tokens,
  });
});

export const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);

  res.status(200).json({
    success: true,
    message: "Logged out",
  });
});

export const getMe = catchAsync(async (req, res) => {
  const user = await authService.getUserById(req.userId);

  res.status(200).json({
    success: true,
    data: { user },
  });
});
