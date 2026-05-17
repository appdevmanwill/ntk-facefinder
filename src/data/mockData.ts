// ============================================
// NTK-FaceFinder Mock Data
// ============================================

export interface DemoFolder {
  id: string;
  path: string;
  imageCount: number;
  indexedCount: number;
  status: 'fully-indexed' | 'partial' | 'not-indexed';
  lastScanned: string | null;
  facesFound: number;
  sizeGB: number;
}

export interface DemoPerson {
  id: string;
  name: string;
  photoCount: number;
  avatar: string;
}

export interface DemoSearchResult {
  id: string;
  folder: string;
  filename: string;
  thumbnail: string;
  confidence: number;
  selected: boolean;
  faceBox: { x: number; y: number; w: number; h: number };
  date: string;
  size: string;
  dimensions: string;
  camera?: string;
  iso?: string;
  shutter?: string;
  aperture?: string;
}

export interface DemoExport {
  id: string;
  name: string;
  type: string;
  count: number;
  size: string;
  date: string;
  status: 'completed' | 'failed' | 'in-progress';
}

export interface DashboardStats {
  totalPhotos: number;
  facesDetected: number;
  uniquePeople: number;
  searchesPerformed: number;
  totalIndexed: number;
  storageUsed: string;
}

export const DEMO_FOLDERS: DemoFolder[] = [
  {
    id: '1',
    path: 'C:/Photos/Family/',
    imageCount: 2341,
    indexedCount: 2341,
    status: 'fully-indexed',
    lastScanned: '2024-01-15 14:32',
    facesFound: 847,
    sizeGB: 12.4
  },
  {
    id: '2',
    path: 'D:/Vacations/2023/',
    imageCount: 1892,
    indexedCount: 1243,
    status: 'partial',
    lastScanned: '2024-01-12 09:15',
    facesFound: 523,
    sizeGB: 18.7
  },
  {
    id: '3',
    path: 'E:/Work Events/',
    imageCount: 567,
    indexedCount: 567,
    status: 'fully-indexed',
    lastScanned: '2024-01-10 16:45',
    facesFound: 234,
    sizeGB: 4.2
  },
  {
    id: '4',
    path: 'F:/Old Backups/Photos/',
    imageCount: 3201,
    indexedCount: 0,
    status: 'not-indexed',
    lastScanned: null,
    facesFound: 0,
    sizeGB: 28.9
  }
];

export const DEMO_PEOPLE: DemoPerson[] = [
  { id: '1', name: 'Mom', photoCount: 247, avatar: 'https://i.pravatar.cc/150?img=47' },
  { id: '2', name: 'Dad', photoCount: 198, avatar: 'https://i.pravatar.cc/150?img=52' },
  { id: '3', name: 'Sarah', photoCount: 156, avatar: 'https://i.pravatar.cc/150?img=44' },
  { id: '4', name: 'John', photoCount: 127, avatar: 'https://i.pravatar.cc/150?img=67' },
  { id: '5', name: 'Emma', photoCount: 89, avatar: 'https://i.pravatar.cc/150?img=41' },
  { id: '6', name: 'Mike', photoCount: 74, avatar: 'https://i.pravatar.cc/150?img=68' },
  { id: '7', name: 'Lisa', photoCount: 63, avatar: 'https://i.pravatar.cc/150?img=45' },
  { id: '8', name: 'David', photoCount: 23, avatar: 'https://i.pravatar.cc/150?img=69' }
];

// Helper to generate a single result
function genResult(id: number, folder: string, filename: string, conf: number, date: string): DemoSearchResult {
  const cameras = ['Canon EOS R5', 'Sony A7 IV', 'Nikon Z6', 'iPhone 15 Pro', 'Samsung S24', 'Fujifilm X-T5'];
  const isos = ['100', '200', '400', '800', '1600', '3200'];
  const shutters = ['1/60', '1/125', '1/250', '1/500', '1/1000', '1/2000'];
  const apertures = ['f/1.4', 'f/1.8', 'f/2.8', 'f/4', 'f/5.6', 'f/8'];
  
  return {
    id: String(id),
    folder,
    filename,
    thumbnail: `https://picsum.photos/seed/face${id}/300/200`,
    confidence: conf,
    selected: conf >= 85,
    faceBox: {
      x: 80 + Math.floor(Math.random() * 100),
      y: 40 + Math.floor(Math.random() * 60),
      w: 70 + Math.floor(Math.random() * 40),
      h: 70 + Math.floor(Math.random() * 40)
    },
    date,
    size: `${(2 + Math.random() * 6).toFixed(1)} MB`,
    dimensions: `${3000 + Math.floor(Math.random() * 2000)}x${2000 + Math.floor(Math.random() * 1500)}`,
    camera: cameras[Math.floor(Math.random() * cameras.length)],
    iso: isos[Math.floor(Math.random() * isos.length)],
    shutter: shutters[Math.floor(Math.random() * shutters.length)],
    aperture: apertures[Math.floor(Math.random() * apertures.length)],
  };
}

// Generate 127 search results
function generateSearchResults(): DemoSearchResult[] {
  const results: DemoSearchResult[] = [];
  const folders = [
    { path: 'C:/Photos/Family/', count: 68 },
    { path: 'D:/Vacations/2023/', count: 42 },
    { path: 'E:/Work Events/', count: 17 },
  ];
  
  const familyFiles = [
    'birthday_party_2023.jpg', 'christmas_dinner.jpg', 'park_picnic.jpg', 'graduation_day.jpg',
    'anniversary_celebration.jpg', 'sunday_brunch.jpg', 'garden_party.jpg', 'cooking_together.jpg',
    'movie_night.jpg', 'thanksgiving_2023.jpg', 'easter_sunday.jpg', 'new_years_eve.jpg',
    'backyard_bbq.jpg', 'kids_playing.jpg', 'family_portrait.jpg', 'beach_day.jpg',
    'hiking_trip.jpg', 'camping_weekend.jpg', 'birthday_cake.jpg', 'opening_presents.jpg',
    'breakfast_table.jpg', 'game_night.jpg', 'fireworks.jpg', 'grandparents_visit.jpg',
    'summer_vacation.jpg', 'pool_party.jpg', 'wedding_anniversary.jpg', 'baby_shower.jpg',
    'first_day_school.jpg', 'soccer_game.jpg', 'ballet_recital.jpg', 'zoo_visit.jpg',
    'aquarium_trip.jpg', 'museum_day.jpg', 'art_class.jpg', 'music_lesson.jpg',
    'science_fair.jpg', 'book_reading.jpg', 'gardening_day.jpg', 'baking_cookies.jpg',
    'snowman_building.jpg', 'sledding_hill.jpg', 'ice_skating.jpg', 'hot_chocolate.jpg',
    'autumn_leaves.jpg', 'pumpkin_patch.jpg', 'apple_picking.jpg', 'corn_maze.jpg',
    'spring_flowers.jpg', 'butterfly_garden.jpg', 'bird_watching.jpg', 'fishing_trip.jpg',
    'boat_ride.jpg', 'sunset_watching.jpg', 'stargazing_night.jpg', 'bonfire_evening.jpg',
    'pillow_fight.jpg', 'blanket_fort.jpg', 'pajama_party.jpg', 'morning_pancakes.jpg',
    'lunch_picnic.jpg', 'dinner_table.jpg', 'dessert_time.jpg', 'coffee_break.jpg',
    'tea_party.jpg', 'lemonade_stand.jpg', 'craft_time.jpg', 'painting_session.jpg',
  ];
  
  const vacationFiles = [
    'beach_sunset.jpg', 'hotel_pool.jpg', 'city_tour.jpg', 'mountain_hike.jpg',
    'restaurant_selfie.jpg', 'boat_trip.jpg', 'museum_visit.jpg', 'street_food.jpg',
    'historic_site.jpg', 'local_market.jpg', 'cable_car.jpg', 'viewpoint_photo.jpg',
    'waterfall_visit.jpg', 'jungle_trek.jpg', 'snorkeling_trip.jpg', 'diving_adventure.jpg',
    'resort_spa.jpg', 'rooftop_bar.jpg', 'night_market.jpg', 'temple_visit.jpg',
    'palace_tour.jpg', 'garden_walk.jpg', 'river_cruise.jpg', 'kayaking_fun.jpg',
    'parasailing.jpg', 'jet_ski_ride.jpg', 'beach_volleyball.jpg', 'sandcastle.jpg',
    'seashell_hunting.jpg', 'tide_pool.jpg', 'lighthouse_photo.jpg', 'pier_sunset.jpg',
    'boardwalk_stroll.jpg', 'ice_cream_break.jpg', 'souvenir_shop.jpg', 'airport_arrival.jpg',
    'flight_window.jpg', 'luggage_claim.jpg', 'hotel_room.jpg', 'balcony_view.jpg',
    'breakfast_buffet.jpg', 'poolside_lunch.jpg',
  ];
  
  const workFiles = [
    'conference_keynote.jpg', 'team_lunch.jpg', 'award_ceremony.jpg', 'networking_event.jpg',
    'workshop_session.jpg', 'panel_discussion.jpg', 'product_launch.jpg', 'company_party.jpg',
    'team_building.jpg', 'office_celebration.jpg', 'client_meeting.jpg', 'presentation.jpg',
    'brainstorm_session.jpg', 'coffee_chat.jpg', 'farewell_party.jpg', 'welcome_dinner.jpg',
    'annual_gala.jpg',
  ];

  let id = 1;
  
  // Family folder - 68 results with varied confidence
  for (let i = 0; i < 68; i++) {
    const conf = i < 15 ? 98 - i : i < 30 ? 82 - (i - 15) * 0.5 : i < 50 ? 74 - (i - 30) * 0.3 : 62 + Math.random() * 8;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    results.push(genResult(id++, folders[0].path, familyFiles[i % familyFiles.length], Math.round(conf), `2023-${month}-${day}`));
  }
  
  // Vacations folder - 42 results
  for (let i = 0; i < 42; i++) {
    const conf = i < 10 ? 96 - i * 0.5 : i < 25 ? 85 - (i - 10) * 0.4 : 70 + Math.random() * 12;
    results.push(genResult(id++, folders[1].path, vacationFiles[i % vacationFiles.length], Math.round(conf), `2023-07-${String(Math.floor(i / 3) + 1).padStart(2, '0')}`));
  }
  
  // Work Events folder - 17 results
  for (let i = 0; i < 17; i++) {
    const conf = i < 5 ? 94 - i : i < 12 ? 84 - (i - 5) * 0.5 : 68 + Math.random() * 10;
    const month = i < 8 ? '10' : i < 14 ? '11' : '12';
    results.push(genResult(id++, folders[2].path, workFiles[i % workFiles.length], Math.round(conf), `2023-${month}-${String((i % 15) + 1).padStart(2, '0')}`));
  }
  
  return results;
}

export const DEMO_SEARCH_RESULTS: DemoSearchResult[] = generateSearchResults();

export const DEMO_EXPORTS: DemoExport[] = [
  { id: '1', name: 'Mom_Photos_2024-01-15', type: 'ZIP', count: 87, size: '342 MB', date: '2024-01-15', status: 'completed' },
  { id: '2', name: 'John_Vacation_Photos', type: 'Local Copy', count: 43, size: '198 MB', date: '2024-01-12', status: 'completed' },
  { id: '3', name: 'Family_Reunion_Export', type: 'ZIP', count: 156, size: '621 MB', date: '2024-01-10', status: 'completed' },
  { id: '4', name: 'Work_Events_Sarah', type: 'Cloud Upload', count: 23, size: '89 MB', date: '2024-01-08', status: 'failed' },
  { id: '5', name: 'Dad_Birthday_Photos', type: 'ZIP', count: 34, size: '156 MB', date: '2024-01-05', status: 'completed' }
];

export const DASHBOARD_STATS: DashboardStats = {
  totalPhotos: 8547,
  facesDetected: 2341,
  uniquePeople: 8,
  searchesPerformed: 23,
  totalIndexed: 6821,
  storageUsed: '64.2 GB'
};

export const GALLERY_PHOTOS = Array.from({ length: 48 }, (_, i) => ({
  id: String(i + 1),
  thumbnail: `https://picsum.photos/seed/gal${i + 1}/400/300`,
  filename: `IMG_${String(1000 + i)}.jpg`,
  date: `2023-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
  size: `${(2 + Math.random() * 8).toFixed(1)} MB`,
  dimensions: `${3000 + Math.floor(Math.random() * 2000)}x${2000 + Math.floor(Math.random() * 1500)}`,
  scanned: i % 5 !== 3,
  faceCount: i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0,
  people: i % 4 === 0 ? ['Mom', 'Dad'] : i % 3 === 0 ? ['Sarah'] : [],
  album: i < 12 ? 'Family' : i < 24 ? 'Vacations' : i < 36 ? 'Work Events' : 'Unorganized'
}));

export const ACTIVITY_TIMELINE = [
  { id: '1', icon: '🔍', text: 'Searched for Mom across 3 folders — Found 247 matches', time: '2 hours ago', color: '#6366f1' },
  { id: '2', icon: '📁', text: 'Scanned Work Events folder — 567 photos indexed', time: '1 day ago', color: '#10b981' },
  { id: '3', icon: '📤', text: 'Exported 87 photos as ZIP — Mom_Photos_2024.zip', time: '1 day ago', color: '#f59e0b' },
  { id: '4', icon: '☁️', text: 'Imported 34 photos from Google Drive', time: '2 days ago', color: '#3b82f6' },
  { id: '5', icon: '👥', text: 'Renamed Person 3 to Sarah', time: '3 days ago', color: '#8b5cf6' },
  { id: '6', icon: '🔍', text: 'Searched for Dad across 2 folders — Found 198 matches', time: '3 days ago', color: '#6366f1' },
  { id: '7', icon: '📁', text: 'Scanned Family folder — 2,341 photos indexed', time: '4 days ago', color: '#10b981' },
  { id: '8', icon: '📤', text: 'Exported 43 photos — John_Vacation_Photos', time: '5 days ago', color: '#f59e0b' },
  { id: '9', icon: '👥', text: 'Merged Person 5 and Person 6 into Emma', time: '6 days ago', color: '#8b5cf6' },
  { id: '10', icon: '☁️', text: 'Connected Google Drive account', time: '1 week ago', color: '#3b82f6' },
];
