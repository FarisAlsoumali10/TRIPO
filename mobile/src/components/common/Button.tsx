import React from 'react';
import { Button as PaperButton } from 'react-native-paper';
import { StyleSheet } from 'react-native';

interface ButtonProps {
  children: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  mode?: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
  style?: any;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  loading = false,
  disabled = false,
  mode = 'contained',
  style,
}) => {
  return (
    <PaperButton
      mode={mode}
      onPress={onPress}
      loading={!!loading}
      disabled={disabled || loading}
      style={[styles.button, style]}
      contentStyle={styles.buttonContent}
    >
      {children}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    marginVertical: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});

export default Button;
