// School transport: fleet and crew, routes and stops, riders, today's trips and the family view.
import api from './api';

const base = '/auth/transport';

export interface Vehicle {
  id: string; name: string; registration_no: string; kind: string; capacity: number; make_model: string;
  insurance_expiry: string | null; fitness_expiry: string | null; notes: string; is_active: boolean; expiring: string[];
}
export interface Crew {
  id: string; role: 'driver' | 'attendant'; name: string; phone: string; licence_no: string; licence_expiry: string | null;
  national_id: string; user_email: string; is_active: boolean; expiring: string[];
}
export interface Stop { id?: string; name: string; address: string; order?: number; morning_time: string | null; afternoon_time: string | null; latitude?: number | null; longitude?: number | null }
export interface Route {
  id: string; name: string; code: string; monthly_fee: number; notes: string; is_active: boolean; riders: number; seats_left: number | null;
  vehicle: { id: string; name: string; registration_no: string; capacity: number } | null;
  driver: { id: string; name: string; phone: string } | null; attendant: { id: string; name: string; phone: string } | null;
  stops: Stop[]; rider_list?: Rider[];
}
export interface Rider {
  id: string; student: { id: string; full_name: string; student_id: string; class_name: string }; route_id: string; route_name: string;
  pickup_stop: Stop | null; dropoff_stop: Stop | null; direction: 'both' | 'morning' | 'afternoon'; direction_label: string;
  start_date: string; end_date: string | null; monthly_fee: number; own_fee: boolean; notes: string;
}
export interface TripInfo {
  id: string | null; kind: 'morning' | 'afternoon'; status: 'not_started' | 'en_route' | 'completed'; status_label: string;
  started_at: string | null; completed_at: string | null; delay_minutes: number; note: string;
}
export interface BoardRow { route: { id: string; name: string; vehicle: string; driver: string; driver_phone: string };
  trips: Array<TripInfo & { riders: number; absent: number; boarded: number; dropped: number; no_show: number }> }
export interface ManifestRow {
  rider_id: string; student: { id: string; full_name: string; class_name: string }; stop: Stop | null; absent: string | null;
  events: Partial<Record<'boarded' | 'dropped' | 'no_show', string>>; notes: string;
  may_collect: Array<{ name: string; relationship: string; phone: string }>; may_not_collect: string[];
  contacts: Array<{ name: string; phone: string }>;
}
export interface Manifest { route: Route; date: string; kind: 'morning' | 'afternoon'; trip: TripInfo; students: ManifestRow[] }
export interface FamilyTransport {
  student: { id: string; full_name: string }; rider: Rider | null; route?: { name: string; code: string };
  vehicle?: { name: string; registration_no: string; kind: string } | null; driver?: { name: string; phone: string } | null;
  attendant?: { name: string; phone: string } | null; absent_today?: string | null;
  trips?: Array<TripInfo & { events: Record<string, string> }>;
}
export interface TransportReport {
  routes: Array<{ id: string; name: string; vehicle: string; capacity: number | null; riders: number; full_percent: number | null; monthly_fees: number; stops: number }>;
  riders: number; monthly_fees: number; trips_30_days: number; completed_30_days: number; delayed_30_days: number;
  average_delay: number; no_shows_30_days: number; expiring: Array<{ what: string; items: string[] }>;
}

const transport = {
  vehicles: async () => (await api.get<Vehicle[]>(`${base}/vehicles/`)).data,
  saveVehicle: async (v: Partial<Vehicle>) => (v.id ? (await api.patch<Vehicle>(`${base}/vehicles/${v.id}/`, v)).data : (await api.post<Vehicle>(`${base}/vehicles/`, v)).data),
  removeVehicle: async (id: string) => api.delete(`${base}/vehicles/${id}/`),
  crew: async () => (await api.get<Crew[]>(`${base}/staff/`)).data,
  saveCrew: async (c: Partial<Crew>) => (c.id ? (await api.patch<Crew>(`${base}/staff/${c.id}/`, c)).data : (await api.post<Crew>(`${base}/staff/`, c)).data),
  removeCrew: async (id: string) => api.delete(`${base}/staff/${id}/`),
  routes: async () => (await api.get<Route[]>(`${base}/routes/`)).data,
  route: async (id: string) => (await api.get<Route>(`${base}/routes/${id}/`)).data,
  saveRoute: async (r: Record<string, unknown>) => (r.id ? (await api.patch<Route>(`${base}/routes/${r.id}/`, r)).data : (await api.post<Route>(`${base}/routes/`, r)).data),
  removeRoute: async (id: string) => api.delete(`${base}/routes/${id}/`),
  saveStops: async (id: string, stops: Stop[]) => (await api.put<Stop[]>(`${base}/routes/${id}/stops/`, { stops })).data,
  riders: async (params: { route?: string; q?: string } = {}) => (await api.get<Rider[]>(`${base}/riders/`, { params })).data,
  addRider: async (body: Record<string, unknown>) => (await api.post<Rider>(`${base}/riders/`, body)).data,
  updateRider: async (id: string, body: Record<string, unknown>) => (await api.patch<Rider>(`${base}/riders/${id}/`, body)).data,
  endRider: async (id: string) => api.delete(`${base}/riders/${id}/`),
  today: async (date = '') => (await api.get<{ date: string; routes: BoardRow[] }>(`${base}/today/`, { params: date ? { date } : {} })).data,
  manifest: async (routeId: string, kind: string) => (await api.get<Manifest>(`${base}/routes/${routeId}/manifest/`, { params: { kind } })).data,
  tripAction: async (routeId: string, kind: string, action: 'start' | 'delay' | 'complete', extra: { minutes?: number; note?: string } = {}) =>
    (await api.post<TripInfo & { people_told: number }>(`${base}/routes/${routeId}/trip/`, { kind, action, ...extra })).data,
  mark: async (tripId: string, student_id: string, event: 'boarded' | 'dropped' | 'no_show') =>
    (await api.post<{ at: string; created: boolean }>(`${base}/trips/${tripId}/event/`, { student_id, event })).data,
  unmark: async (tripId: string, student_id: string, event: string) => api.delete(`${base}/trips/${tripId}/event/`, { params: { student_id, event } }),
  mine: async () => (await api.get<{ date: string; children: FamilyTransport[] }>(`${base}/mine/`)).data,
  invoices: async (month: string, route_id = '') => (await api.post<{ created: number; already_billed: number; no_fee: number; month: string }>(`${base}/invoices/`, { month, ...(route_id ? { route_id } : {}) })).data,
  report: async () => (await api.get<TransportReport>(`${base}/report/`)).data,
};

export const errorText = (e: any, fallback: string) => e?.response?.data?.error || fallback;
export default transport;
