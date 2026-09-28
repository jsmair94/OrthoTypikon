import { Circle, Line, Path, Rect, Svg } from 'react-native-svg';

export type LibraryTopicKey =
  | 'patristics'
  | 'bible'
  | 'theology'
  | 'saints-service'
  | 'liturgy'
  | 'heresies'
  | 'history'
  | 'spiritual'
  | 'afterlife'
  | 'icons'
  | 'saints'
  | 'family'
  | 'services'
  | 'music'
  | 'theotokos';

type LibraryTopicArtworkProps = {
  topic: LibraryTopicKey;
  size?: number;
  color?: string;
};

export function LibraryTopicArtwork({ topic, size = 48, color = '#FFF5E4' }: LibraryTopicArtworkProps) {
  const common = {
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {topic === 'patristics' ? (
        <>
          <Path d="M7 10.5A4.5 4.5 0 0 1 11.5 6H24v29H11.5A4.5 4.5 0 0 0 7 39.5v-29Z" {...common} />
          <Path d="M41 10.5A4.5 4.5 0 0 0 36.5 6H24v29h12.5a4.5 4.5 0 0 1 4.5 4.5v-29Z" {...common} />
          <Path d="M24 13v12M19 18h10" {...common} />
        </>
      ) : topic === 'bible' ? (
        <>
          <Path d="M6 11a5 5 0 0 1 5-5h11v30H11a5 5 0 0 0-5 5V11Z" {...common} />
          <Path d="M42 11a5 5 0 0 0-5-5H24v30h13a5 5 0 0 1 5 5V11Z" {...common} />
          <Path d="M24 13v12M19 18h10" {...common} />
          <Line x1="12" y1="29" x2="19" y2="29" {...common} />
        </>
      ) : topic === 'theology' ? (
        <>
          <Circle cx="24" cy="24" r="14" {...common} />
          <Circle cx="24" cy="24" r="4" {...common} />
          <Line x1="24" y1="4" x2="24" y2="10" {...common} />
          <Line x1="24" y1="38" x2="24" y2="44" {...common} />
          <Line x1="4" y1="24" x2="10" y2="24" {...common} />
          <Line x1="38" y1="24" x2="44" y2="24" {...common} />
          <Line x1="10" y1="10" x2="14" y2="14" {...common} />
          <Line x1="34" y1="34" x2="38" y2="38" {...common} />
          <Line x1="38" y1="10" x2="34" y2="14" {...common} />
          <Line x1="14" y1="34" x2="10" y2="38" {...common} />
        </>
      ) : topic === 'saints-service' ? (
        <>
          <Path d="M10 39h28M14 39V20h20v19M10 20h28M24 6v8M19 10h10" {...common} />
          <Path d="M18 20v-5h12v5M20 26h8M24 22v8" {...common} />
          <Circle cx="24" cy="10" r="2" {...common} />
        </>
      ) : topic === 'liturgy' ? (
        <>
          <Path d="M8 20 24 10l16 10v20H8V20Z" {...common} />
          <Path d="M18 40V27h12v13M13 21h22M24 4v8M19 7h10" {...common} />
          <Path d="M15 40v-8M33 40v-8" {...common} />
        </>
      ) : topic === 'heresies' ? (
        <>
          <Path d="M24 5 40 11v10c0 10-6.7 17.4-16 22-9.3-4.6-16-12-16-22V11l16-6Z" {...common} />
          <Path d="m16 16 16 16M32 16 16 32" {...common} />
          <Circle cx="24" cy="24" r="4" {...common} />
        </>
      ) : topic === 'history' ? (
        <>
          <Circle cx="24" cy="24" r="16" {...common} />
          <Path d="M24 14v11l7 4M10 8l-4 4M38 8l4 4" {...common} />
          <Path d="M17 42h14M20 38v4M28 38v4" {...common} />
        </>
      ) : topic === 'spiritual' ? (
        <>
          <Path d="M24 39S8 30 8 19a8 8 0 0 1 16-3 8 8 0 0 1 16 3c0 11-16 20-16 20Z" {...common} />
          <Path d="M24 13v12M19 18h10" {...common} />
        </>
      ) : topic === 'afterlife' ? (
        <>
          <Path d="M7 35h34M12 30a12 12 0 0 1 24 0M24 7v7M12 13l4 4M36 13l-4 4" {...common} />
          <Path d="M16 41h16M20 35v6M28 35v6" {...common} />
        </>
      ) : topic === 'icons' ? (
        <>
          <Rect x="10" y="5" width="28" height="38" rx="3" {...common} />
          <Circle cx="24" cy="20" r="7" {...common} />
          <Path d="M16 34c2-5 14-5 16 0M24 10v20M19 15h10" {...common} />
        </>
      ) : topic === 'saints' ? (
        <>
          <Circle cx="24" cy="18" r="6" {...common} />
          <Path d="M13 40a11 11 0 0 1 22 0M24 5v5M19 7.5h10" {...common} />
          <Path d="m9 15 2 4 4 .6-3 3 .7 4-3.7-2-3.7 2 .7-4-3-3 4-.6 2-4Z" {...common} />
        </>
      ) : topic === 'family' ? (
        <>
          <Circle cx="16" cy="16" r="5" {...common} />
          <Circle cx="32" cy="17" r="5" {...common} />
          <Path d="M7 40a9 9 0 0 1 18 0M23 40a9 9 0 0 1 18 0" {...common} />
          <Circle cx="24" cy="29" r="3" {...common} />
        </>
      ) : topic === 'services' ? (
        <>
          <Path d="M13 20h22v12H13zM9 32h30M18 20v-7M30 20v-7M15 13h18" {...common} />
          <Path d="M22 8c0-3 4-3 4-6M28 8c0-3 4-3 4-6" {...common} />
          <Path d="M19 26h10M24 22v8" {...common} />
        </>
      ) : topic === 'music' ? (
        <>
          <Path d="M17 36V10l19-4v25" {...common} />
          <Circle cx="11" cy="36" r="6" {...common} />
          <Circle cx="30" cy="31" r="6" {...common} />
          <Path d="M17 15 36 11" {...common} />
        </>
      ) : (
        <>
          <Path d="M24 41S10 32 10 19a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 13-14 22-14 22Z" {...common} />
          <Path d="M24 7v9M20 11h8" {...common} />
          <Circle cx="24" cy="24" r="4" {...common} />
        </>
      )}
    </Svg>
  );
}