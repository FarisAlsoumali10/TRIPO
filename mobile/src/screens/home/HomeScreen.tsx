import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Banner } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { MainTabParamList } from '../../navigation/types';
import ForYouFeed from '../../components/feed/ForYouFeed';

type HomeScreenNavigationProp = NativeStackNavigationProp<MainTabParamList, 'Profile'>;

const HomeScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [showBanner, setShowBanner] = React.useState(false);

  React.useEffect(() => {
    // Check if smart profile is incomplete
    if (user && user.smartProfile.interests.length === 0) {
      setShowBanner(true);
    }
  }, [user]);

  const handleCompletProfile = () => {
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
              label: 'Complete Now',
              onPress: handleCompletProfile,
            },
            {
              label: 'Later',
              onPress: () => setShowBanner(false),
            },
          ]}
          icon="lightbulb-outline"
        >
          <Text variant="bodyMedium">
            Complete your Smart Profile to get personalized itinerary recommendations!
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
    backgroundColor: '#fff',
  },
});

export default HomeScreen;
