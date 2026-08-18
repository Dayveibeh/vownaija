import { useRef } from "react";
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

type Props = PressableProps & {
  containerStyle?: StyleProp<ViewStyle>;
  pressedScale?: number;
};

export function MotionPressable({ containerStyle, pressedScale = 0.985, onPressIn, onPressOut, children, ...props }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function animate(toValue: number) {
    Animated.spring(scale, { toValue, damping: 18, stiffness: 280, mass: 0.7, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          animate(pressedScale);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animate(1);
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
