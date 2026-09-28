import { Image } from 'react-native';
import type { ImageResizeMode, ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';
import type { LibraryTopicKey } from './LibraryTopicArtwork';

const topicImages: Record<LibraryTopicKey, ImageSourcePropType> = {
  patristics: require('../assets/images/library/patristics.jpg'),
  bible: require('../assets/images/library/bible.jpg'),
  theology: require('../assets/images/library/theology.jpg'),
  'saints-service': require('../assets/images/library/saints-service.jpg'),
  heresies: require('../assets/images/library/heresies.jpg'),
  history: require('../assets/images/library/history.jpg'),
  liturgy: require('../assets/images/library/liturgy.jpg'),
  spiritual: require('../assets/images/library/spiritual.jpg'),
  afterlife: require('../assets/images/library/afterlife.jpg'),
  icons: require('../assets/images/library/icons.jpg'),
  saints: require('../assets/images/library/saints.jpg'),
  family: require('../assets/images/library/family.jpg'),
  services: require('../assets/images/library/services.jpg'),
  music: require('../assets/images/library/music.jpg'),
  theotokos: require('../assets/images/library/theotokos.jpg'),
};

export function LibraryTopicImage({
  topic,
  style,
  resizeMode = 'cover',
}: {
  topic: LibraryTopicKey;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
}) {
  return <Image source={topicImages[topic]} resizeMode={resizeMode} style={style} />;
}