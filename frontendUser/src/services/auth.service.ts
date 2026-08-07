import api from './api';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email?: string;
  password: string;
  name: string;
  phone?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  gender?: string;
  birthday?: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const authService = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterData): Promise<any> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  verifyRegisterOtp: async (email: string, otp: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/verify-register-otp', { email, otp });
    return response.data;
  },

  resendRegisterOtp: async (email: string) => {
    const response = await api.post('/auth/resend-register-otp', { email });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileData) => {
    const response = await api.patch('/users/profile', data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordData) => {
    const response = await api.patch('/users/change-password', data);
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  verifyOtp: async (email: string, otp: string) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },

  resetPassword: async (email: string, otp: string, newPasswordDto: string) => {
    const response = await api.post('/auth/reset-password', {
      email,
      otp,
      newPassword: newPasswordDto,
    });
    return response.data;
  }
};

export default authService;
