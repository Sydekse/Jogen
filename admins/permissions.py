from rest_framework.permissions import BasePermission


class IsComplianceAdmin(BasePermission):
    """
    Allows access strictly to authenticated Compliance Admin users.
    """

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.is_staff
        )