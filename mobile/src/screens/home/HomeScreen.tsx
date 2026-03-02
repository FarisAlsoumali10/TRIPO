import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Banner } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
// تم التعديل هنا: استخدام Stack بدلاً من NativeStack
import type { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { MainTabParamList } from '../../navigation/types';
import ForYouFeed from '../../components/feed/ForYouFeed';

// تم التعديل هنا أيضاً ليتطابق مع المكتبة الصحيحة
type HomeScreenNavigationProp = StackNavigationProp<MainTabParamList, 'Profile'>;

const HomeScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [showBanner, setShowBanner] = React.useState(false);

  React.useEffect(() => {
    // 🛡️ الحماية هنا: استخدام علامة الاستفهام الآمنة لتجنب انهيار التطبيق
    if (user && (!user.smartProfile || user.smartProfile?.interests?.length === 0)) {
      setShowBanner(true);
    }
  }, [user]);

  const handleCompleteProfile = () => { // تم تصحيح الخطأ الإملائي في اسم الدالة
    setShowBanner(false);
    navigation.navigate('Profile', {
      screen: 'SmartProfile',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {showBanner && (
        <Banner
          visible={showBanner}
          actions={[
            {
              label: 'إكمال الآن',
              onPress: handleCompleteProfile,
            },
            {
              label: 'لاحقاً',
              onPress: () => setShowBanner(false),
            },
          ]}
          icon="lightbulb-outline"
        >
          <Text variant="bodyMedium">
            أكمل ملفك الذكي الآن للحصول على اقتراحات رحلات مخصصة لاهتماماتك! ✨
          </Text>
        </Banner>
      )}
      <ForYouFeed />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // تم توحيد لون الخلفية مع باقي التطبيق
  },
});

export default HomeScreen;