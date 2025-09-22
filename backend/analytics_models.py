# Analytics System Models
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
import uuid

class AnalyticsRequest(BaseModel):
    date_range: str = Field(default="last_30_days", pattern="^(last_7_days|last_30_days|last_90_days|last_6_months|last_year|custom)$")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    metrics: Optional[List[str]] = None  # Specific metrics to include
    breakdown_by: Optional[str] = None   # day, week, month, category, etc.

class ChartData(BaseModel):
    label: str
    value: Union[int, float]
    percentage: Optional[float] = None
    color: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ResidentAnalytics(BaseModel):
    total: int = 0
    active: int = 0
    new_this_period: int = 0
    growth_rate: float = 0.0
    occupancy_rate: float = 0.0
    avg_family_size: float = 0.0
    
    # Demographics
    owners_count: int = 0
    tenants_count: int = 0
    families_with_children: int = 0
    senior_residents: int = 0
    
    # Activity metrics
    login_rate: float = 0.0
    feature_usage_rate: float = 0.0
    avg_session_duration: float = 0.0  # in minutes
    
    # Trends
    monthly_growth: List[ChartData] = Field(default_factory=list)
    unit_type_distribution: List[ChartData] = Field(default_factory=list)
    family_size_distribution: List[ChartData] = Field(default_factory=list)

class MaintenanceAnalytics(BaseModel):
    total: int = 0
    pending: int = 0
    in_progress: int = 0
    completed: int = 0
    cancelled: int = 0
    
    # Performance metrics
    avg_response_time: float = 0.0  # in hours
    avg_completion_time: float = 0.0  # in hours
    completion_rate: float = 0.0
    avg_satisfaction: float = 0.0
    avg_cost: float = 0.0
    
    # Trends
    growth_rate: float = 0.0
    seasonal_trends: List[ChartData] = Field(default_factory=list)
    category_breakdown: List[ChartData] = Field(default_factory=list)
    priority_breakdown: List[ChartData] = Field(default_factory=list)
    response_time_trend: List[ChartData] = Field(default_factory=list)

class RevenueAnalytics(BaseModel):
    total: float = 0.0
    collected: float = 0.0
    outstanding: float = 0.0
    overdue: float = 0.0
    
    # Performance metrics
    collection_rate: float = 0.0
    avg_payment_time: float = 0.0  # in days
    growth_rate: float = 0.0
    
    # Payment analysis
    payment_methods: List[ChartData] = Field(default_factory=list)
    monthly_revenue: List[ChartData] = Field(default_factory=list)
    unit_type_revenue: List[ChartData] = Field(default_factory=list)
    late_payment_trends: List[ChartData] = Field(default_factory=list)

class EngagementAnalytics(BaseModel):
    daily_active: int = 0
    weekly_active: int = 0
    monthly_active: int = 0
    total_sessions: int = 0
    avg_session_duration: float = 0.0  # in minutes
    feature_adoption: float = 0.0
    
    # Rates and trends
    rate: float = 0.0
    growth_rate: float = 0.0
    retention_rate: float = 0.0
    
    # Feature usage
    feature_usage: List[ChartData] = Field(default_factory=list)
    notification_engagement: List[ChartData] = Field(default_factory=list)
    page_views: List[ChartData] = Field(default_factory=list)
    user_journey: List[ChartData] = Field(default_factory=list)

class EventsAnalytics(BaseModel):
    total_events: int = 0
    upcoming_events: int = 0
    past_events: int = 0
    cancelled_events: int = 0
    
    # Engagement
    total_attendees: int = 0
    avg_attendance_rate: float = 0.0
    avg_event_rating: float = 0.0
    repeat_attendee_rate: float = 0.0
    
    # Categories
    category_popularity: List[ChartData] = Field(default_factory=list)
    monthly_events: List[ChartData] = Field(default_factory=list)
    attendance_trends: List[ChartData] = Field(default_factory=list)

class GuestAnalytics(BaseModel):
    total_visitors: int = 0
    approved_visitors: int = 0
    rejected_visitors: int = 0
    active_visits: int = 0
    
    # Performance metrics
    approval_rate: float = 0.0
    avg_approval_time: float = 0.0  # in hours
    avg_visit_duration: float = 0.0  # in hours
    repeat_visitor_rate: float = 0.0
    
    # Visit purposes
    purpose_breakdown: List[ChartData] = Field(default_factory=list)
    monthly_visits: List[ChartData] = Field(default_factory=list)
    peak_visiting_hours: List[ChartData] = Field(default_factory=list)

class AnalyticsSummary(BaseModel):
    period: str
    start_date: datetime
    end_date: datetime
    
    # Key achievements
    achievements: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    
    # Alerts and warnings
    alerts: List[Dict[str, str]] = Field(default_factory=list)
    warnings: List[Dict[str, str]] = Field(default_factory=list)
    
    # Performance scores (0-100)
    overall_score: float = 0.0
    resident_satisfaction_score: float = 0.0
    operational_efficiency_score: float = 0.0
    financial_health_score: float = 0.0

class ComprehensiveAnalytics(BaseModel):
    # Core metrics
    residents: ResidentAnalytics = Field(default_factory=ResidentAnalytics)
    maintenance: MaintenanceAnalytics = Field(default_factory=MaintenanceAnalytics)
    revenue: RevenueAnalytics = Field(default_factory=RevenueAnalytics)
    engagement: EngagementAnalytics = Field(default_factory=EngagementAnalytics)
    events: EventsAnalytics = Field(default_factory=EventsAnalytics)
    guests: GuestAnalytics = Field(default_factory=GuestAnalytics)
    
    # Chart data for dashboard
    charts: Dict[str, List[ChartData]] = Field(default_factory=dict)
    
    # Recent activity
    recent_activity: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Summary and insights
    summary: AnalyticsSummary = Field(default_factory=AnalyticsSummary)
    
    # Metadata
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    requested_by: str
    compound_id: str
    cache_expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnalyticsExport(BaseModel):
    format: str = Field(..., pattern="^(csv|xlsx|pdf|json)$")
    date_range: str
    sections: List[str] = Field(default_factory=list)  # Which sections to include
    include_charts: bool = True
    include_raw_data: bool = False

class MetricComparison(BaseModel):
    metric_name: str
    current_period: float
    previous_period: float
    change_amount: float
    change_percentage: float
    trend: str = Field(..., pattern="^(up|down|stable)$")
    
class Benchmark(BaseModel):
    metric_name: str
    current_value: float
    benchmark_value: float
    performance: str = Field(..., pattern="^(above|below|at)$")  # relative to benchmark
    percentile: Optional[int] = None  # If available

class AlertRule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    metric_path: str  # e.g., "maintenance.avg_response_time"
    condition: str = Field(..., pattern="^(greater_than|less_than|equals|not_equals)$")
    threshold: float
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    is_active: bool = True
    
    # Notification settings
    notify_users: List[str] = Field(default_factory=list)
    notify_roles: List[str] = Field(default_factory=list)
    notification_frequency: str = Field(default="immediate", pattern="^(immediate|daily|weekly)$")
    
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_triggered: Optional[datetime] = None
    trigger_count: int = 0

class AnalyticsAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rule_id: str
    rule_name: str
    metric_path: str
    current_value: float
    threshold: float
    severity: str
    message: str
    
    # Status
    status: str = Field(default="active", pattern="^(active|acknowledged|resolved)$")
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    
    # Context
    compound_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = Field(default_factory=dict)