import React, { useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
}

const MotionPressable = Animated.createAnimatedComponent(Pressable);

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  style,
  pressedScale = 0.98,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number, duration: number) => {
    Animated.timing(scale, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return (
    <MotionPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) animateTo(pressedScale, 35); // Snappy 35ms press in
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!disabled) animateTo(1, 55); // Immediate 55ms release
        onPressOut?.(event);
      }}
      style={[style, { transform: [{ scale }] }]}
    />
  );
};

export default AnimatedPressable;
