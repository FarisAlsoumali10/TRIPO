import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { Language } from '../../types';
import { ProfileStackParamList } from '../../navigation/types';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

const ProfileScreen = () => {
  const { user, updateUser, logout } = useAuth();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [name, setName] = useState(user?.name || '');
  const [language, setLanguage] = useState<Language>(user?.language || 'en');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await authAPI.updateProfile({ name, language });
      updateUser(updatedUser);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update profile'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const hasSmartProfile = user?.smartProfile.interests.length || 0 > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            Profile Information
          </Text>

          <Input
            label="Name"
            value={name}
            onChangeText={setName}
            disabled={!editing}
          />

          <View style={styles.infoItem}>
            <Text variant="bodyMedium" style={styles.infoLabel}>
              Email
            </Text>
            <Text variant="bodyLarge">{user?.email}</Text>
          </View>

          <View style={styles.pickerContainer}>
            <Text variant="bodyMedium" style={styles.pickerLabel}>
              Language
            </Text>
            <View style={styles.picker}>
              <Picker
                selectedValue={language}
                onValueChange={(value) => setLanguage(value as Language)}
                enabled={editing}
              >
                <Picker.Item label="English" value="en" />
                <Picker.Item label="العربية" value="ar" />
              </Picker>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Text variant="bodyMedium" style={styles.infoLabel}>
              City
            </Text>
            <Text variant="bodyLarge">{user?.smartProfile.city}</Text>
          </View>

          {editing ? (
            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={() => {
                  setEditing(false);
                  setName(user?.name || '');
                  setLanguage(user?.language || 'en');
                }}
                disabled={loading}
                style={styles.halfButton}
              >
                Cancel
              </Button>
              <Button
                onPress={handleSave}
                loading={loading}
                style={styles.halfButton}
              >
                Save Changes
              </Button>
            </View>
          ) : (
            <Button onPress={() => setEditing(true)}>
              Edit Profile
            </Button>
          )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            Smart Profile
          </Text>

          {hasSmartProfile ? (
            <>
              <View style={styles.smartProfileInfo}>
                <View style={styles.infoItem}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>
                    Interests
                  </Text>
                  <Text variant="bodyLarge">
                    {user?.smartProfile.interests.join(', ')}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>
                    Free Time Window
                  </Text>
                  <Text variant="bodyLarge">
                    {user?.smartProfile.typicalFreeTimeWindow} hours
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>
                    Budget
                  </Text>
                  <Text variant="bodyLarge">
                    {user?.smartProfile.preferredBudget}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text variant="bodyMedium" style={styles.infoLabel}>
                    Activity Styles
                  </Text>
                  <Text variant="bodyLarge">
                    {user?.smartProfile.activityStyles.join(', ')}
                  </Text>
                </View>

                {user?.smartProfile.mood && (
                  <View style={styles.infoItem}>
                    <Text variant="bodyMedium" style={styles.infoLabel}>
                      Mood
                    </Text>
                    <Text variant="bodyLarge">{user.smartProfile.mood}</Text>
                  </View>
                )}
              </View>

              <Button
                onPress={() => navigation.navigate('SmartProfile')}
                mode="outlined"
              >
                Edit Smart Profile
              </Button>
            </>
          ) : (
            <>
              <Text variant="bodyMedium" style={styles.noSmartProfile}>
                Complete your Smart Profile to get personalized itinerary
                recommendations
              </Text>
              <Button onPress={() => navigation.navigate('SmartProfile')}>
                Complete Smart Profile
              </Button>
            </>
          )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            Logout
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    color: '#6B7280',
    marginBottom: 4,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    marginBottom: 8,
    color: '#6B7280',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
  divider: {
    marginVertical: 24,
  },
  smartProfileInfo: {
    marginBottom: 16,
  },
  noSmartProfile: {
    color: '#6B7280',
    marginBottom: 16,
  },
  logoutButton: {
    borderColor: '#EF4444',
  },
});

export default ProfileScreen;
