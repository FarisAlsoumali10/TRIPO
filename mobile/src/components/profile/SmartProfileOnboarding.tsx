import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Chip, RadioButton, ProgressBar } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { BudgetLevel } from '../../types';
import Button from '../common/Button';

const INTERESTS = [
  'Food',
  'Culture',
  'Nature',
  'Adventure',
  'Shopping',
  'Entertainment',
  'Relaxation',
  'History',
];

const ACTIVITY_STYLES = [
  'Relaxed',
  'Active',
  'Cultural',
  'Social',
  'Solo',
  'Family-Friendly',
];

const MOODS = ['Curious', 'Adventurous', 'Relaxed', 'Romantic', 'Energetic'];

const BUDGET_OPTIONS: { label: string; value: BudgetLevel }[] = [
  { label: 'Free', value: 'free' },
  { label: 'Low ($)', value: 'low' },
  { label: 'Medium ($$)', value: 'medium' },
  { label: 'High ($$$)', value: 'high' },
];

interface SmartProfileData {
  interests: string[];
  typicalFreeTimeWindow: number;
  preferredBudget: BudgetLevel;
  activityStyles: string[];
  mood: string;
}

interface SmartProfileOnboardingProps {
  initialData?: Partial<SmartProfileData>;
  onSubmit: (data: SmartProfileData) => void;
  loading?: boolean;
}

const SmartProfileOnboarding: React.FC<SmartProfileOnboardingProps> = ({
  initialData,
  onSubmit,
  loading = false,
}) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SmartProfileData>({
    interests: initialData?.interests || [],
    typicalFreeTimeWindow: initialData?.typicalFreeTimeWindow || 2,
    preferredBudget: initialData?.preferredBudget || 'medium',
    activityStyles: initialData?.activityStyles || [],
    mood: initialData?.mood || '',
  });

  const toggleInterest = (interest: string) => {
    setData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const toggleActivityStyle = (style: string) => {
    setData((prev) => ({
      ...prev,
      activityStyles: prev.activityStyles.includes(style)
        ? prev.activityStyles.filter((s) => s !== style)
        : [...prev.activityStyles, style],
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.interests.length > 0;
      case 2:
        return true;
      case 3:
        return data.activityStyles.length > 0;
      case 4:
        return data.mood !== '';
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onSubmit(data);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              What interests you?
            </Text>
            <Text variant="bodyMedium" style={styles.stepSubtitle}>
              Select all that apply
            </Text>
            <View style={styles.chipContainer}>
              {INTERESTS.map((interest) => (
                <Chip
                  key={interest}
                  selected={data.interests.includes(interest)}
                  onPress={() => toggleInterest(interest)}
                  style={styles.chip}
                >
                  {interest}
                </Chip>
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              Time & Budget
            </Text>

            <View style={styles.section}>
              <Text variant="bodyLarge" style={styles.sectionTitle}>
                Typical free time window
              </Text>
              <Text variant="bodyMedium" style={styles.sliderValue}>
                {data.typicalFreeTimeWindow} hours
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={8}
                step={0.5}
                value={data.typicalFreeTimeWindow}
                onValueChange={(value) =>
                  setData((prev) => ({ ...prev, typicalFreeTimeWindow: value }))
                }
                minimumTrackTintColor="#3B82F6"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#3B82F6"
              />
            </View>

            <View style={styles.section}>
              <Text variant="bodyLarge" style={styles.sectionTitle}>
                Preferred budget
              </Text>
              <RadioButton.Group
                onValueChange={(value) =>
                  setData((prev) => ({ ...prev, preferredBudget: value as BudgetLevel }))
                }
                value={data.preferredBudget}
              >
                {BUDGET_OPTIONS.map((option) => (
                  <View key={option.value} style={styles.radioItem}>
                    <RadioButton value={option.value} />
                    <Text variant="bodyMedium">{option.label}</Text>
                  </View>
                ))}
              </RadioButton.Group>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              Activity styles
            </Text>
            <Text variant="bodyMedium" style={styles.stepSubtitle}>
              How do you like to explore?
            </Text>
            <View style={styles.chipContainer}>
              {ACTIVITY_STYLES.map((style) => (
                <Chip
                  key={style}
                  selected={data.activityStyles.includes(style)}
                  onPress={() => toggleActivityStyle(style)}
                  style={styles.chip}
                >
                  {style}
                </Chip>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              What's your mood?
            </Text>
            <Text variant="bodyMedium" style={styles.stepSubtitle}>
              Select one that best describes you
            </Text>
            <View style={styles.chipContainer}>
              {MOODS.map((mood) => (
                <Chip
                  key={mood}
                  selected={data.mood === mood}
                  onPress={() => setData((prev) => ({ ...prev, mood }))}
                  style={styles.chip}
                >
                  {mood}
                </Chip>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ProgressBar progress={step / 4} color="#3B82F6" style={styles.progress} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {[1, 2, 3, 4].map((dot) => (
            <View
              key={dot}
              style={[styles.dot, dot === step && styles.activeDot]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          {step > 1 && (
            <Button mode="outlined" onPress={handleBack} disabled={loading}>
              Back
            </Button>
          )}
          <Button
            onPress={handleNext}
            disabled={!canProceed()}
            loading={!!loading}
            style={styles.nextButton}
          >
            {step === 4 ? 'Complete' : 'Next'}
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progress: {
    height: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSubtitle: {
    color: '#6B7280',
    marginBottom: 24,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    textAlign: 'center',
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  activeDot: {
    backgroundColor: '#3B82F6',
    width: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  nextButton: {
    flex: 1,
  },
});

export default SmartProfileOnboarding;
