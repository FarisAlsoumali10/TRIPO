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
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  // تعريب رسائل التحقق من الأخطاء
  const validate = () => {
    let isValid = true;
    const newErrors = { email: '', password: '' };

    if (!email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'صيغة البريد الإلكتروني غير صحيحة';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'كلمة المرور مطلوبة';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
  if (!validate()) return;

  setLoading(true);
  try {
    await login({ email: email.toLowerCase(), password });
  } catch (error: any) {
    let errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.';
    
    // Extract error message from various possible locations
    if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    Alert.alert('فشل تسجيل الدخول', errorMessage);
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
     <KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  enabled={Platform.OS === 'ios'} 
  style={styles.keyboardView}
>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text variant="displaySmall" style={styles.title}>
              مرحباً بك مجدداً 👋
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              سجل دخولك لمواصلة تخطيط رحلاتك مع أصدقائك
            </Text>

            <View style={styles.form}>
              <Input
                
  label="البريد الإلكتروني"
  value={email}
  onChangeText={setEmail}
  placeholder="أدخل بريدك الإلكتروني"
  keyboardType="email-address"
  autoCapitalize="none"
  autoComplete="email"
  error={errors.email} 
/>
              
<Input
  label="كلمة المرور"
  value={password}
  onChangeText={setPassword}
  placeholder="أدخل كلمة المرور"
  secureTextEntry
  autoComplete="password"
  error={errors.password} 
/>

              <Button
                onPress={handleLogin}
                loading={!!loading}
                style={styles.loginButton}
              >
                تسجيل الدخول
              </Button>

              <Button
                mode="text"
                onPress={() => navigation.navigate('Register')}
                disabled={loading}
                style={styles.linkButton}
              >
                ليس لديك حساب؟ أنشئ حساباً جديداً
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
    backgroundColor: '#F3F4F6', // توحيد لون الخلفية ليتطابق مع شاشة التسجيل
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
    color: '#1F2937', // لون نص متناسق
  },
  subtitle: {
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    marginTop: 16,
    backgroundColor: '#FFFFFF', // وضع الحقول داخل بطاقة بيضاء
    padding: 20,
    borderRadius: 20,
    elevation: 4, // ظل للبطاقة
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  loginButton: {
    marginTop: 15,
  },
  linkButton: {
    marginTop: 10,
  }
});

export default LoginScreen;