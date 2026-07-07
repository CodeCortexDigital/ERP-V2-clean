export const theme = {
  // Primary brand colors (My School Green)
  primary: '#0A5C36',
  primaryLight: '#1B7A44',
  primaryHover: '#0E4A2A',
  
  // Neutral colors
  border: '#E0E0E0',
  background: '#F5F5F5',
  textDark: '#333333',
  textLight: '#FFFFFF',
  
  // Module colors (can be changed easily)
  modules: {
    Dashboard: { main: '#4B5563', light: '#F3F4F6', hover: '#374151', text: '#FFFFFF', border: '#6B7280' },
    Business:   { main: '#2563EB', light: '#EFF6FF', hover: '#1D4ED8', text: '#FFFFFF', border: '#3B82F6' },
    Education:  { main: '#16A34A', light: '#F0FDF4', hover: '#15803D', text: '#FFFFFF', border: '#22C55E' },
    Analytics:  { main: '#9333EA', light: '#FAF5FF', hover: '#7E22CE', text: '#FFFFFF', border: '#A855F7' },
    AIML:       { main: '#4F46E5', light: '#EEF2FF', hover: '#4338CA', text: '#FFFFFF', border: '#6366F1' },
    Workflow:   { main: '#EA580C', light: '#FFF7ED', hover: '#C2410C', text: '#FFFFFF', border: '#F97316' },
    Shared:     { main: '#0891B2', light: '#ECFEFF', hover: '#0E7490', text: '#FFFFFF', border: '#06B6D4' },
    System:     { main: '#DC2626', light: '#FEF2F2', hover: '#B91C1C', text: '#FFFFFF', border: '#EF4444' },
  },
  
  // Get module theme by name
  getModuleTheme: function(moduleName: string) {
    return this.modules[moduleName as keyof typeof this.modules] || this.modules.Dashboard
  }
}

export type ThemeType = typeof theme
