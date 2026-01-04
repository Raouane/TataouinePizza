/**
 * Gestion avancée des horaires d'ouverture des restaurants
 * Supporte les horaires avec coupures, weekends différents, et fuseau horaire tunisien (UTC+1)
 */

/**
 * Structure JSON pour les horaires d'un restaurant
 * 
 * Exemple avec horaires différents pour le weekend et coupures l'après-midi :
 * {
 *   "weekdays": [
 *     { "start": "11:00", "end": "15:00" },
 *     { "start": "18:00", "end": "23:00" }
 *   ],
 *   "weekend": [
 *     { "start": "12:00", "end": "16:00" },
 *     { "start": "19:00", "end": "00:00" }
 *   ]
 * }
 */
export interface OpeningHoursSchedule {
  weekdays?: TimeSlot[]; // Lundi à Vendredi
  weekend?: TimeSlot[];  // Samedi et Dimanche
  // Optionnel : horaires spécifiques par jour
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface TimeSlot {
  start: string; // Format "HH:MM" (ex: "11:00")
  end: string;   // Format "HH:MM" (ex: "23:00" ou "00:00" pour minuit)
}

/**
 * Exemple de structure JSON pour un restaurant
 * Horaires avec coupures l'après-midi et weekends différents
 */
export const EXAMPLE_RESTAURANT_SCHEDULE: OpeningHoursSchedule = {
  weekdays: [
    { start: "11:00", end: "15:00" },  // Service déjeuner
    { start: "18:00", end: "23:00" }   // Service dîner
  ],
  weekend: [
    { start: "12:00", end: "16:00" },  // Service déjeuner weekend
    { start: "19:00", end: "00:00" }   // Service dîner weekend (jusqu'à minuit)
  ]
};

/**
 * Obtient l'heure actuelle en Tunisie (UTC+1)
 * La Tunisie n'utilise pas l'heure d'été, donc toujours UTC+1
 */
function getTunisiaTime(): Date {
  const now = new Date();
  // Obtenir l'heure UTC
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  // Ajouter le décalage de la Tunisie (UTC+1 = +1 heure = 3600000 ms)
  const tunisiaTime = new Date(utcTime + (1 * 60 * 60 * 1000));
  return tunisiaTime;
}

/**
 * Convertit une heure "HH:MM" en minutes depuis minuit
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Vérifie si une heure actuelle (en minutes) est dans un créneau horaire
 * Gère les cas où le créneau passe minuit (ex: "23:00" à "02:00")
 */
function isTimeInSlot(currentMinutes: number, slot: TimeSlot): boolean {
  const startMinutes = timeToMinutes(slot.start);
  const endMinutes = timeToMinutes(slot.end);
  
  // Cas normal : le créneau se termine le même jour
  if (endMinutes > startMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  
  // Cas où le créneau passe minuit (ex: "23:00" à "00:00" ou "02:00")
  // "00:00" = 0 minutes = minuit
  if (endMinutes === 0) {
    // Si end est "00:00", on considère que c'est minuit (fin de journée)
    return currentMinutes >= startMinutes;
  }
  
  // Cas où le créneau passe minuit (ex: "23:00" à "02:00")
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

/**
 * Obtient les créneaux horaires pour un jour donné
 */
function getTimeSlotsForDay(schedule: OpeningHoursSchedule, dayOfWeek: number): TimeSlot[] {
  // dayOfWeek: 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
  
  // Vérifier d'abord les horaires spécifiques par jour
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek] as keyof OpeningHoursSchedule;
  
  if (schedule[dayName] && Array.isArray(schedule[dayName])) {
    return schedule[dayName] as TimeSlot[];
  }
  
  // Sinon, utiliser weekdays ou weekend
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Dimanche ou Samedi
  
  if (isWeekend && schedule.weekend) {
    return schedule.weekend;
  }
  
  if (!isWeekend && schedule.weekdays) {
    return schedule.weekdays;
  }
  
  // Par défaut, retourner un tableau vide (restaurant fermé)
  return [];
}

/**
 * Calcule la prochaine heure d'ouverture
 * Retourne null si le restaurant est ouvert maintenant
 */
function getNextOpenTime(schedule: OpeningHoursSchedule, currentDate: Date): string | null {
  const dayOfWeek = currentDate.getDay();
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  
  const todaySlots = getTimeSlotsForDay(schedule, dayOfWeek);
  
  // Vérifier s'il y a un créneau plus tard aujourd'hui
  for (const slot of todaySlots) {
    const startMinutes = timeToMinutes(slot.start);
    if (startMinutes > currentMinutes) {
      return slot.start;
    }
  }
  
  // Sinon, chercher le prochain jour avec des horaires
  for (let i = 1; i <= 7; i++) {
    const nextDay = (dayOfWeek + i) % 7;
    const nextDaySlots = getTimeSlotsForDay(schedule, nextDay);
    if (nextDaySlots.length > 0) {
      return nextDaySlots[0].start;
    }
  }
  
  return null;
}

/**
 * Résultat de la vérification du statut d'ouverture
 */
export interface RestaurantOpenStatus {
  isOpen: boolean;
  nextOpenTime?: string | null; // Prochaine heure d'ouverture (format "HH:MM")
  reason?: 'closed' | 'open';
}

/**
 * Vérifie si un restaurant est ouvert en ce moment
 * 
 * @param schedule - Structure JSON des horaires d'ouverture
 * @returns Statut d'ouverture avec la prochaine heure d'ouverture si fermé
 */
export function isRestaurantOpen(schedule: OpeningHoursSchedule | null | undefined): RestaurantOpenStatus {
  // Si pas d'horaires définis, considérer fermé par sécurité
  if (!schedule) {
    return { isOpen: false, reason: 'closed' };
  }
  
  // Obtenir l'heure actuelle en Tunisie
  const tunisiaTime = getTunisiaTime();
  const dayOfWeek = tunisiaTime.getDay();
  const currentMinutes = tunisiaTime.getHours() * 60 + tunisiaTime.getMinutes();
  
  // Obtenir les créneaux pour aujourd'hui
  const todaySlots = getTimeSlotsForDay(schedule, dayOfWeek);
  
  // Si aucun créneau aujourd'hui, le restaurant est fermé
  if (todaySlots.length === 0) {
    const nextOpenTime = getNextOpenTime(schedule, tunisiaTime);
    return { 
      isOpen: false, 
      reason: 'closed',
      nextOpenTime 
    };
  }
  
  // Vérifier si l'heure actuelle est dans un des créneaux
  for (const slot of todaySlots) {
    if (isTimeInSlot(currentMinutes, slot)) {
      return { isOpen: true, reason: 'open' };
    }
  }
  
  // Le restaurant est fermé, mais il y a des horaires aujourd'hui
  // Calculer la prochaine heure d'ouverture
  const nextOpenTime = getNextOpenTime(schedule, tunisiaTime);
  return { 
    isOpen: false, 
    reason: 'closed',
    nextOpenTime 
  };
}

/**
 * Fonction utilitaire pour parser un JSON string en OpeningHoursSchedule
 * Utile quand les horaires sont stockés en base de données comme texte JSON
 */
export function parseOpeningHoursSchedule(jsonString: string | null | undefined): OpeningHoursSchedule | null {
  if (!jsonString || jsonString.trim() === '') {
    return null;
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    return parsed as OpeningHoursSchedule;
  } catch (error) {
    console.error('Erreur lors du parsing des horaires:', error);
    return null;
  }
}

/**
 * Traductions des jours de la semaine
 */
const dayTranslations = {
  fr: {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche',
    weekdays: 'Lundi-Vendredi',
    weekend: 'Samedi-Dimanche',
  },
  en: {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    weekdays: 'Monday-Friday',
    weekend: 'Saturday-Sunday',
  },
  ar: {
    monday: 'الإثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت',
    sunday: 'الأحد',
    weekdays: 'الإثنين-الجمعة',
    weekend: 'السبت-الأحد',
  },
};

/**
 * Formate un créneau horaire en texte lisible
 */
function formatTimeSlot(slot: TimeSlot): string {
  return `${slot.start} - ${slot.end === "00:00" ? "24:00" : slot.end}`;
}

/**
 * Formate plusieurs créneaux horaires en texte lisible
 */
function formatTimeSlots(slots: TimeSlot[]): string {
  return slots.map(formatTimeSlot).join(', ');
}

/**
 * Formate les horaires d'ouverture en texte lisible et traduit
 * 
 * @param schedule - Structure JSON des horaires
 * @param language - Langue pour la traduction ('fr', 'en', 'ar')
 * @returns Texte formaté des horaires (ex: "Lundi-Vendredi: 11:00-15:00, 18:00-23:00 | Samedi-Dimanche: 12:00-16:00, 19:00-24:00")
 */
export function formatOpeningHours(
  schedule: OpeningHoursSchedule | null | undefined,
  language: 'fr' | 'en' | 'ar' = 'fr'
): string {
  if (!schedule) {
    return '';
  }

  const t = dayTranslations[language];
  const parts: string[] = [];

  // Horaires spécifiques par jour (priorité)
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const specificDays: Array<{ day: string; slots: TimeSlot[] }> = [];
  
  for (const day of dayOrder) {
    const dayKey = day as keyof OpeningHoursSchedule;
    if (schedule[dayKey] && Array.isArray(schedule[dayKey])) {
      specificDays.push({
        day: t[day as keyof typeof t],
        slots: schedule[dayKey] as TimeSlot[],
      });
    }
  }

  // Si des jours spécifiques sont définis, les utiliser
  if (specificDays.length > 0) {
    // Grouper les jours consécutifs avec les mêmes horaires
    const grouped: Array<{ days: string[]; slots: TimeSlot[] }> = [];
    
    for (const { day, slots } of specificDays) {
      const slotsStr = JSON.stringify(slots);
      const existing = grouped.find(g => JSON.stringify(g.slots) === slotsStr);
      
      if (existing) {
        existing.days.push(day);
      } else {
        grouped.push({ days: [day], slots });
      }
    }

    // Formater chaque groupe
    for (const group of grouped) {
      const daysStr = group.days.length > 1 
        ? `${group.days[0]}-${group.days[group.days.length - 1]}`
        : group.days[0];
      parts.push(`${daysStr}: ${formatTimeSlots(group.slots)}`);
    }
  } else {
    // Utiliser weekdays et weekend
    if (schedule.weekdays && schedule.weekdays.length > 0) {
      parts.push(`${t.weekdays}: ${formatTimeSlots(schedule.weekdays)}`);
    }
    
    if (schedule.weekend && schedule.weekend.length > 0) {
      parts.push(`${t.weekend}: ${formatTimeSlots(schedule.weekend)}`);
    }
  }

  return parts.join(' | ');
}
