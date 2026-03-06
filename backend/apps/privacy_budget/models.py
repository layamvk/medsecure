from django.db import models
from django.conf import settings


class PrivacyBudget(models.Model):
    """Privacy budget tracking for differential privacy."""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='privacy_budgets'
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='privacy_budgets'
    )
    
    # Privacy Budget Parameters
    epsilon = models.FloatField(default=1.0)  # Privacy loss parameter
    delta = models.FloatField(default=0.00001)  # Failure probability
    total_budget = models.FloatField(default=10.0)  # Total allowed epsilon
    consumed_budget = models.FloatField(default=0.0)  # Used epsilon
    
    # Query Tracking
    query_count = models.IntegerField(default=0)
    last_query_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reset_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Privacy Budget'
        verbose_name_plural = 'Privacy Budgets'
        unique_together = ('user', 'patient')
        ordering = ['-updated_at']
    
    @property
    def remaining_budget(self):
        return self.total_budget - self.consumed_budget
    
    @property
    def budget_percentage(self):
        if self.total_budget == 0:
            return 0
        return (self.consumed_budget / self.total_budget) * 100
    
    def __str__(self):
        return f"{self.user} - {self.patient} (Remaining: {self.remaining_budget:.2f})"
