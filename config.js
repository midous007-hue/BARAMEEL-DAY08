/* BARAMEEL WORLD — Supabase public browser configuration.
   Publishable keys are intended for browser use. Never put a Supabase secret key here.
*/
window.BARAMEEL_SUPABASE_URL = 'https://gwsbvhgkrcoksygmxdvm.supabase.co';
window.BARAMEEL_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_n9G1Yj3-2Yf_kuN-1pa0_A_29TwxjUW';
window.BARAMEEL_API_BASE = 'https://gwsbvhgkrcoksygmxdvm.supabase.co/functions/v1';

/*
 * CHECKPOINT RUN — route dataset.
 * Coordinates are calibrated from the supplied Google Maps screenshots.
 * Checkpoint order is the discovery order only; players may collect any
 * currently unlocked checkpoint in any physical order, and BARAMEEL is
 * always available as a destination.
 */
window.BARAMEEL_ROUTE_CONFIG = {
  destination: {
    id: 'barameel',
    name: 'BARAMEEL',
    lat: 31.190520,
    lng: 29.920547,
    radius_meters: 120
  },
  checkpoints: [
    { id: 'CP01', name: 'CP01', order: 1, lat: 31.1909169, lng: 29.9193794 },
    { id: 'CP02', name: 'CP02', order: 2, lat: 31.189221, lng: 29.920068 },
    { id: 'CP03', name: 'CP03', order: 3, lat: 31.190137, lng: 29.921695 },
    { id: 'CP04', name: 'CP04', order: 4, lat: 31.192098, lng: 29.922995 },
    { id: 'CP05', name: 'CP05', order: 5, lat: 31.191448, lng: 29.915061 },
    { id: 'CP06', name: 'CP06', order: 6, lat: 31.190885, lng: 29.919299 },
    { id: 'CP07', name: 'CP07', order: 7, lat: 31.190167, lng: 29.923662 },
    { id: 'CP08', name: 'CP08', order: 8, lat: 31.188251, lng: 29.921631 },
    { id: 'CP09', name: 'CP09', order: 9, lat: 31.193291, lng: 29.917204 },
    { id: 'CP10', name: 'CP10', order: 10, lat: 31.188515, lng: 29.920420 },
    { id: 'CP11', name: 'CP11', order: 11, lat: 31.188033, lng: 29.919152 },
    { id: 'CP12', name: 'CP12', order: 12, lat: 31.191579, lng: 29.913372 },
    { id: 'CP13', name: 'CP13', order: 13, lat: 31.192904, lng: 29.923414 }
  ]
};
