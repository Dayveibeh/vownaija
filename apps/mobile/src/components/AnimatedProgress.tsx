import { useEffect, useRef, useState } from "react";
import { Animated, Easing, type LayoutChangeEvent, type StyleProp, type ViewStyle, View } from "react-native";

type Props = {
  progress: number;
  trackStyle?: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
  duration?: number;
};

export function AnimatedProgress({ progress, trackStyle, fillStyle, duration = 420 }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trackWidth) return;
    Animated.timing(animatedWidth, {
      toValue: Math.max(0, Math.min(1, progress)) * trackWidth,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedWidth, duration, progress, trackWidth]);

  function measureTrack(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={trackStyle} onLayout={measureTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
      <Animated.View style={[fillStyle, { width: animatedWidth }]} />
    </View>
  );
}
