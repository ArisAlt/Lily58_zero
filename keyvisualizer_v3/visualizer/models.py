from django.db import models


class Layout(models.Model):
    name          = models.CharField(max_length=200, default="Untitled")
    keyboard_name = models.CharField(max_length=200, blank=True)
    board_id      = models.CharField(max_length=100, blank=True)
    routing_result = models.JSONField()
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.board_id}) — {self.created_at:%Y-%m-%d %H:%M}"
