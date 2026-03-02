import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// الاهتمامات التي سيدرسها محرك التوصيات الخاص بـ Tripo
const INTEREST_CATEGORIES = [
  'طبيعة 🌴', 'مغامرة 🧗', 'تاريخ وتراث 🏛️',
  'مطاعم ومقاهي ☕', 'استرخاء 🧘', 'تسوق 🛍️',
  'فعاليات ومهرجانات 🎭', 'رحلات بحرية ⛵'
];

export default function RegisterScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // بيانات المستخدم الأساسية
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const handleNextStep = () => {
    if (step === 1 && name && email && password) {
      setStep(2);
    }
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleRegister = () => {
    setIsLoading(true);
    // هنا سيتم لاحقاً ربط دالة التسجيل الحقيقية (AuthContext) التي أسسها زميلك
    setTimeout(() => {
      setIsLoading(false);
      setStep(3); // شاشة النجاح
    }, 1500);
  };

  // الخطوة 1: البيانات الأساسية
  const renderBasicInfo = () => (
    <View style={styles.formContainer}>
      <Text variant="headlineMedium" style={styles.headerTitle}>إنشاء حساب جديد 🌍</Text>
      <Text variant="bodyLarge" style={styles.subHeader}>انضم لـ Tripo وابدأ التخطيط مع أصدقائك</Text>

      <TextInput
        label="الاسم الكامل"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        right={<TextInput.Icon icon="account" />}
      />
      <TextInput
        label="البريد الإلكتروني"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        right={<TextInput.Icon icon="email" />}
      />
      <TextInput
        label="كلمة المرور"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        secureTextEntry
        style={styles.input}
        right={<TextInput.Icon icon="eye" />}
      />

      <Button 
        mode="contained" 
        onPress={handleNextStep} 
        style={styles.actionButton}
        disabled={!name || !email || !password}
      >
        متابعة
      </Button>
      
      <Button 
        mode="text" 
        onPress={() => navigation.goBack()} 
        style={styles.linkButton}
      >
        لديك حساب بالفعل؟ تسجيل الدخول
      </Button>
    </View>
  );

  // الخطوة 2: الاهتمامات (لرحلات الأصدقاء)
  const renderInterests = () => (
    <View style={styles.formContainer}>
      <Text variant="headlineSmall" style={styles.headerTitle}>ما هي اهتماماتك؟ ✨</Text>
      <Text variant="bodyMedium" style={styles.subHeader}>
        سيساعدنا هذا في اقتراح أفضل الأنشطة عندما تخطط لرحلة مع مجموعتك!
      </Text>

      <View style={styles.chipContainer}>
        {INTEREST_CATEGORIES.map((interest) => (
          <Chip
            key={interest}
            selected={selectedInterests.includes(interest)}
            onPress={() => toggleInterest(interest)}
            style={styles.chip}
            showSelectedOverlay
          >
            {interest}
          </Chip>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <Button mode="outlined" onPress={() => setStep(1)} style={styles.halfButton}>
          رجوع
        </Button>
        <Button 
          mode="contained" 
          onPress={handleRegister} 
          style={styles.halfButton}
          disabled={selectedInterests.length === 0}
        >
          اكتشف Tripo
        </Button>
      </View>
    </View>
  );

  // الخطوة 3: شاشة الترحيب السريعة
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <Text variant="displaySmall" style={{ marginBottom: 20 }}>🎉</Text>
      <Text variant="headlineMedium" style={styles.headerTitle}>تم تجهيز حسابك!</Text>
      <Text variant="bodyLarge" style={styles.subHeader}>
        يا {name}، أنت الآن جاهز لإنشاء أول رحلة جماعية لك.
      </Text>
      <Button 
        mode="contained" 
        onPress={() => navigation.goBack()} // مؤقتاً نعود لشاشة الدخول حتى نربط الـ Auth
        style={styles.actionButton}
      >
        تسجيل الدخول للبدء
      </Button>
    </View>
  );

  return (
    <KeyboardAvoidingView 
  style={{ flex: 1, backgroundColor: theme.colors.background }} 
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  enabled={Platform.OS === 'ios'}
>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 20 }}>جاري بناء ملفك الشخصي...</Text>
          </View>
        ) : (
          <>
            {step === 1 && renderBasicInfo()}
            {step === 2 && renderInterests()}
            {step === 3 && renderSuccess()}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  formContainer: {
    width: '100%',
  },
  headerTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subHeader: {
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  actionButton: {
    marginTop: 16,
    paddingVertical: 6,
  },
  linkButton: {
    marginTop: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8, // يتطلب React Native حديث، إذا أعطى خطأ استخدم margin
    marginBottom: 40,
  },
  chip: {
    margin: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  halfButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});