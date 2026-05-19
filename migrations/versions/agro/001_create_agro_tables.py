"""Create all agro_ tables

Revision ID: agro_001
Revises: (leave blank or put your latest existing revision ID here)
Create Date: 2024-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

revision = 'agro_001'
down_revision = None
branch_labels = ('agro',)
depends_on = None


def upgrade():
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')

    op.create_table('agro_farmers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('phone', sa.String(20), unique=True, nullable=False),
        sa.Column('region', sa.String(100), nullable=False),
        sa.Column('state', sa.String(100), nullable=False),
        sa.Column('language_pref', sa.String(10), server_default='en'),
        sa.Column('alert_channels', postgresql.JSONB(), server_default='{"sms": true, "whatsapp": true, "push": true}'),
        sa.Column('device_tokens', postgresql.JSONB(), server_default='[]'),
        sa.Column('quiet_hours_start', sa.String(5), server_default='22:00'),
        sa.Column('quiet_hours_end', sa.String(5), server_default='06:00'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('agro_crops',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('variety', sa.String(100)),
        sa.Column('duration_days', sa.Float()),
        sa.Column('water_req_mm', sa.Float()),
        sa.Column('temp_min_c', sa.Float()),
        sa.Column('temp_max_c', sa.Float()),
        sa.Column('humidity_min_pct', sa.Float()),
        sa.Column('humidity_max_pct', sa.Float()),
        sa.Column('disease_susceptibility', postgresql.JSONB(), server_default='{}'),
        sa.Column('growth_stages', postgresql.JSONB(), server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('agro_farm_zones',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('farmer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agro_farmers.id'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('area_hectares', sa.Float()),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('soil_type', sa.String(50)),
        sa.Column('soil_ph', sa.Float()),
        sa.Column('elevation_m', sa.Float()),
        sa.Column('irrigation_type', sa.String(30)),
        sa.Column('current_crop_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agro_crops.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_agro_farm_zones_farmer_id', 'agro_farm_zones', ['farmer_id'])

    op.create_table('agro_weather_readings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('zone_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agro_farm_zones.id'), nullable=False),
        sa.Column('reading_time', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('source', sa.String(30), server_default='openweather'),
        sa.Column('temp_c', sa.Float()),
        sa.Column('humidity_pct', sa.Float()),
        sa.Column('rainfall_mm', sa.Float(), server_default='0'),
        sa.Column('wind_kmh', sa.Float()),
        sa.Column('wind_direction_deg', sa.Float()),
        sa.Column('uv_index', sa.Float()),
        sa.Column('soil_moisture_pct', sa.Float()),
        sa.Column('soil_temp_c', sa.Float()),
        sa.Column('pressure_hpa', sa.Float()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_agro_weather_zone_time', 'agro_weather_readings', ['zone_id', 'reading_time'])

    op.create_table('agro_yield_predictions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('zone_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agro_farm_zones.id'), nullable=False),
        sa.Column('crop_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agro_crops.id'), nullable=False),
        sa.Column('sowing_date', sa.DateTime(timezone=True)),
        sa.Column('predicted_kg_per_ha', sa.Float()),
        sa.Column('confidence_pct', sa.Float()),
        sa.Column('risk_factors', postgresql.JSONB(), server_default='{}'),
        sa.Column('model_version', sa.String(20)),
        sa.Column('features_snapshot', postgresql.JSONB(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('agro_alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('farmer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agro_farmers.id'), nullable=False),
        sa.Column('zone_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agro_farm_zones.id'), nullable=True),
        sa.Column('alert_type', sa.String(30), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('message_en', sa.Text(), nullable=False),
        sa.Column('message_translated', sa.Text()),
        sa.Column('language_sent', sa.String(10)),
        sa.Column('channels_sent', postgresql.JSONB(), server_default='[]'),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True)),
        sa.Column('expires_at', sa.DateTime(timezone=True)),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_agro_alerts_farmer_active', 'agro_alerts', ['farmer_id', 'is_active'])

    op.create_table('agro_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('farmer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agro_farmers.id'), nullable=False),
        sa.Column('zone_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agro_farm_zones.id'), nullable=True),
        sa.Column('task_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('priority', sa.String(10), server_default='medium'),
        sa.Column('weather_dependent', sa.Boolean(), server_default='true'),
        sa.Column('best_weather_window', postgresql.JSONB(), server_default='{}'),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('yield_impact_pct', sa.Float(), server_default='0'),
        sa.Column('ai_generated', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('agro_irrigation_schedules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('zone_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agro_farm_zones.id'), nullable=False),
        sa.Column('scheduled_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_minutes', sa.Float()),
        sa.Column('water_volume_litres', sa.Float()),
        sa.Column('et0_mm', sa.Float()),
        sa.Column('soil_moisture_before_pct', sa.Float()),
        sa.Column('soil_moisture_after_pct', sa.Float()),
        sa.Column('source', sa.String(20), server_default='ai'),
        sa.Column('executed', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('agro_disease_scans',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('zone_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agro_farm_zones.id'), nullable=False),
        sa.Column('crop_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agro_crops.id'), nullable=True),
        sa.Column('image_url', sa.String(500)),
        sa.Column('detected_diseases', postgresql.JSONB(), server_default='[]'),
        sa.Column('confidence_scores', postgresql.JSONB(), server_default='{}'),
        sa.Column('weather_context', postgresql.JSONB(), server_default='{}'),
        sa.Column('treatment_recommended', sa.Text()),
        sa.Column('scan_result_raw', postgresql.JSONB(), server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('agro_disease_scans')
    op.drop_table('agro_irrigation_schedules')
    op.drop_table('agro_tasks')
    op.drop_table('agro_alerts')
    op.drop_table('agro_yield_predictions')
    op.drop_table('agro_weather_readings')
    op.drop_table('agro_farm_zones')
    op.drop_table('agro_crops')
    op.drop_table('agro_farmers')