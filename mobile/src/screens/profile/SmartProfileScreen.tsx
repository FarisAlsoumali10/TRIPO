import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import SmartProfileOnboarding from '../../components/profile/SmartProfileOnboarding';

const SmartProfileScreen = () => {
  const { user, updateUser } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      const updatedUser = await authAPI.updateSmartProfile({
        ...data,
        city: user?.smartProfile.city || 'Riyadh',
      });
      updateUser(updatedUser);
      Alert.alert(
        'Success',
        'Your Smart Profile has been updated!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SmartProfileOnboarding
        initialData={user?.smartProfile}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default SmartProfileScreen;
