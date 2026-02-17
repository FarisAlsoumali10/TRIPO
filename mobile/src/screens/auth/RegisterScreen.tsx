import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { Language } from '../../types';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const CITIES = ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina'];

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [city, setCity] = useState(CITIES[0]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const validate = () => {
    let isValid = true;
    const newErrors = { name: '', email: '', password: '', confirmPassword: '' };

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        language,
        smartProfile: {
          interests: [],
          preferredBudget: 'medium',
          activityStyles: [],
          typicalFreeTimeWindow: 2,
          city,
        },
      });
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.response?.data?.message || 'Unable to create account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text variant="displaySmall" style={styles.title}>
              Create Account
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Join Tripo and discover amazing places
            </Text>

            <View style={styles.form}>
              <Input
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                autoComplete="name"
                error={errors.name}
              />

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoComplete="password"
                error={errors.password}
              />

              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                autoComplete="password"
                error={errors.confirmPassword}
              />

              <View style={styles.pickerContainer}>
                <Text variant="bodyMedium" style={styles.pickerLabel}>
                  Language
                </Text>
                <View style={styles.picker}>
                  <Picker
                    selectedValue={language}
                    onValueChange={(value) => setLanguage(value as Language)}
                  >
                    <Picker.Item label="English" value="en" />
                    <Picker.Item label="العربية" value="ar" />
                  </Picker>
                </View>
              </View>

              <View style={styles.pickerContainer}>
                <Text variant="bodyMedium" style={styles.pickerLabel}>
                  City
                </Text>
                <View style={styles.picker}>
                  <Picker selectedValue={city} onValueChange={setCity}>
                    {CITIES.map((c) => (
                      <Picker.Item key={c} label={c} value={c} />
                    ))}
                  </Picker>
                </View>
              </View>

              <Button
                onPress={handleRegister}
                loading={loading}
                style={styles.registerButton}
              >
                Sign Up
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.navigate('Login')}
                disabled={loading}
              >
                Already have an account? Sign In
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    marginTop: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    marginBottom: 8,
    marginLeft: 12,
    color: '#6B7280',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  registerButton: {
    marginTop: 8,
  },
});

export default RegisterScreen;
