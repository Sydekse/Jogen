from django.urls import path

from .views import RequestOTPView, VerifyOTPView

urlpatterns = [
    # Notice we don't repeat '/api/v1/auth/' here, just the final part of the path
    path('request-otp/', RequestOTPView.as_view(), name='request-otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
]