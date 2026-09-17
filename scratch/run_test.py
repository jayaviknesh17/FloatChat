import sys
sys.path.insert(0, '.')
from backend.app.services.query_service import QueryService

qs = QueryService()

regions = ['Arabian Sea', 'Bay of Bengal', 'Indian Ocean', 'All Available']
time_ranges = ['Full Record', 'Last 1 Year', 'Last 6 Months', 'Jan 2024 – Jun 2025']
depths = ['Surface', '0–2000 m', 'Custom']

print('=== TESTING REGIONS (Full Record, 0-2000m, Temperature) ===', flush=True)
for r in regions:
    res = qs.get_insights_summary(region=r, time_range='Full Record', depth='0–2000 m', variable='Temperature')
    cov = res['key_insights']['coverage']
    tsig = res['key_insights']['temperature_signal']
    ssig = res['key_insights']['salinity_pattern']
    tc = res['key_insights']['thermocline_depth']
    f_cnt = cov['active_floats']
    obs_cnt = cov['total_observations']
    t_obs = tsig['observed']
    s_obs = ssig['observed']
    tc_m = tc['depth_m']
    print(f'Region [{r}]: Floats={f_cnt}, MatchingObs={obs_cnt:,}, TempObs={t_obs}, SalObs={s_obs}, Thermocline={tc_m}', flush=True)

print('\n=== TESTING TIME RANGES (Arabian Sea, 0-2000m, Temperature) ===', flush=True)
for t in time_ranges:
    res = qs.get_insights_summary(region='Arabian Sea', time_range=t, depth='0–2000 m', variable='Temperature')
    cov = res['key_insights']['coverage']
    f_cnt = cov['active_floats']
    obs_cnt = cov['total_observations']
    print(f'Time [{t}]: Floats={f_cnt}, MatchingObs={obs_cnt:,}', flush=True)

print('\n=== TESTING DEPTHS (Arabian Sea, Full Record, Temperature) ===', flush=True)
for d in depths:
    res = qs.get_insights_summary(region='Arabian Sea', time_range='Full Record', depth=d, variable='Temperature')
    cov = res['key_insights']['coverage']
    tsig = res['key_insights']['temperature_signal']
    f_cnt = cov['active_floats']
    obs_cnt = cov['total_observations']
    t_obs = tsig['observed']
    print(f'Depth [{d}]: Floats={f_cnt}, MatchingObs={obs_cnt:,}, TempObs={t_obs}', flush=True)
