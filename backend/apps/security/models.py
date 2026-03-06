from django.db import models
from django.conf import settings


class SecurityEvent(models.Model):
    """Security events and alerts."""
    
    SEVERITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    
    EVENT_TYPE_CHOICES = (
        ('failed_login', 'Failed Login'),
        ('suspicious_access', 'Suspicious Access'),
        ('data_breach_attempt', 'Data Breach Attempt'),
        ('unauthorized_export', 'Unauthorized Export'),
        ('session_hijack', 'Session Hijack Attempt'),
        ('brute_force', 'Brute Force Attack'),
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='security_events'
    )
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    description = models.TextField()
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_security_events'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Security Event'
        verbose_name_plural = 'Security Events'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['severity', '-timestamp']),
            models.Index(fields=['resolved', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.severity} ({self.timestamp})"


class DeviceTrustScore(models.Model):
    """Per-device trust scoring for a user."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='device_trust_scores'
    )
    device_id = models.CharField(max_length=255)
    trust_score = models.IntegerField(default=100)
    last_verified = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('user', 'device_id')
        ordering = ['-trust_score', '-last_verified']

    def __str__(self):
        return f"{self.user} - {self.device_id} ({self.trust_score})"


class GlobalThreatScore(models.Model):
    """Singleton storing current global threat level."""
    score = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Global threat: {self.score}"