from django.urls import path
from rest_framework_simplejwt.views import TokenBlacklistView, TokenRefreshView

from .views import RequestOTPView, UpdateProfileView, UserProfileView, VerifyOTPView

urlpatterns = [
    # Notice we don't repeat '/api/v1/auth/' here, just the final part of the path
    # path("send-otp/", SendOtpView.as_view(), name="send-otp"),
    path("request-otp/", RequestOTPView.as_view(), name="request-otp"),
    path("verify-otp/", VerifyOTPView.as_view(), name="verify-otp"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", TokenBlacklistView.as_view(), name="token-blacklist"),
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path("profile/update/", UpdateProfileView.as_view(), name="update-profile"),
]
