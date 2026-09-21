from django.conf import settings


class LegalVectorRouter:
    """
    Routes LegalDocumentEmbedding queries and migrations to 'vector_db' (Neon).
    """

    def db_for_read(self, model, **hints):
        if model._meta.model_name == "legaldocumentembedding":
            if "vector_db" in settings.DATABASES:
                return "vector_db"
        return None

    def db_for_write(self, model, **hints):
        if model._meta.model_name == "legaldocumentembedding":
            if "vector_db" in settings.DATABASES:
                return "vector_db"
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if model_name == "legaldocumentembedding":
            if "vector_db" in settings.DATABASES:
                return db in ("vector_db", "default")
        return True
