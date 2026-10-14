const apiHost = process.env.EXPO_PUBLIC_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  || 'api.orthotypikon.org';
const exploreImage = (id: string) => `https://${apiHost}/api/explore-images/${id}`;

export const exploreItems = [
  {
    key: 'audio-gospel',
    icon: 'book',
    route: '/bible',
    color: '#55706B',
  },
  {
    key: 'library',
    imageUrl: exploreImage('library'),
    imageResizeMode: 'stretch',
    route: '/library',
    color: '#25394A',
  },
  {
    key: 'prayer',
    imageUrl: exploreImage('prayer'),
    imageResizeMode: 'stretch',
    route: '/prayer',
    color: '#8C5948',
  },
  {
    key: 'kitchen',
    imageUrl: exploreImage('kitchen'),
    imageResizeMode: 'contain',
    route: '/fasting',
    color: '#271A12',
  },
  {
    key: 'learn',
    imageUrl: exploreImage('learn'),
    imageResizeMode: 'stretch',
    route: '/learn',
    color: '#6C7C96',
  },
  {
    key: 'pastoral',
    imageUrl: exploreImage('pastoral'),
    imageResizeMode: 'stretch',
    route: '/pastoral',
    color: '#8C5948',
  },
  {
    key: 'places',
    imageUrl: exploreImage('places'),
    imageResizeMode: 'stretch',
    route: '/places',
    color: '#B47732',
  },
  {
    key: 'prayers',
    imageUrl: exploreImage('prayers'),
    imageResizeMode: 'stretch',
    route: '/library',
    color: '#534E50',
  },
] as const;
