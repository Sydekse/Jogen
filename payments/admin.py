from django.contrib import admin

from .models import EscrowTransaction, UserWallet, WalletTransaction


@admin.register(UserWallet)
class UserWalletAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "balance", "reserved_balance", "available_balance", "currency", "is_frozen"]
    search_fields = ["user__phone_number", "user__email"]
    list_filter = ["is_frozen", "currency"]


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "wallet",
        "transaction_type",
        "amount",
        "running_balance",
        "reference",
        "status",
        "created_at",
    ]
    search_fields = ["reference", "wallet__user__phone_number", "wallet__user__email"]
    list_filter = ["transaction_type", "status", "created_at"]


@admin.register(EscrowTransaction)
class EscrowTransactionAdmin(admin.ModelAdmin):
    list_display = ["id", "booking", "tx_ref", "amount", "status", "created_at"]
    search_fields = ["tx_ref", "booking__id"]
    list_filter = ["status", "created_at"]

