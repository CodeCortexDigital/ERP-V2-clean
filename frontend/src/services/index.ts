export { default as academicsService } from './academics.service';
export { default as admissionsService } from './admissions.service';
export { default as classSectionService } from './classSection.service';
export { default as notificationService } from './notification.service';
export { default as websocketService } from './websocket.service';
export * from './apiEndpoints';

export const initializeServices = () => {
  import('./websocket.service').then(module => {
    if (module.default.connect) {
      module.default.connect();
    }
  });
  
  import('./notification.service').then(module => {
    if (module.default.startPolling) {
      module.default.startPolling();
    }
  });
};
