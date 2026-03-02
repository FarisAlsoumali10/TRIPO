import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { itineraryAPI } from '../../services/api';
import { HomeStackParamList } from '../../navigation/types';
import { Place } from '../../types';

type ItineraryDetailRouteProp = RouteProp<HomeStackParamList, 'ItineraryDetail'>;

const ItineraryDetailScreen = () => {
  const route = useRoute<ItineraryDetailRouteProp>();
  const { id } = route.params;

  const { data: itinerary, isLoading, isError } = useQuery({
    queryKey: ['itinerary', id],
    queryFn: () => itineraryAPI.getItinerary(id),
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (isError || !itinerary) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="titleMedium">تعذر تحميل تفاصيل الرحلة</Text>
        <Text variant="bodyMedium" style={styles.errorText}>
          يرجى المحاولة مرة أخرى لاحقاً
        </Text>
      </View>
    );
  }

  const authorName =
    typeof itinerary.userId === 'object' ? itinerary.userId.name : 'مستخدم مجهول';
  const firstPlace = itinerary.places?.[0]?.placeId as Place;
  const heroImage = firstPlace?.photos?.[0];

  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} دقيقة`;
    }
    return `${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return 'مجاناً';
    return `${cost} ر.س`;
  };

  const formatDistance = (km: number) => {
    return `${km.toFixed(1)} كم`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        {heroImage && (
          <Image
            source={{ uri: heroImage }}
            style={styles.heroImage}
            contentFit="cover"
          />
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>
              {itinerary.title}
            </Text>
            {itinerary.isVerified && (
              <MaterialCommunityIcons
                name="check-decagram"
                size={24}
                color="#059669"
                style={styles.verifiedIcon}
              />
            )}
          </View>

          <Text variant="bodyMedium" style={styles.author}>
            بواسطة {authorName}
          </Text>

          <View style={styles.metadata}>
            <View style={styles.metadataItem}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#6B7280" />
              <Text variant="bodyMedium" style={styles.metadataText}>
                {formatDuration(itinerary.estimatedDuration)}
              </Text>
            </View>

            <View style={styles.metadataItem}>
              <MaterialCommunityIcons name="cash" size={20} color="#6B7280" />
              <Text variant="bodyMedium" style={styles.metadataText}>
                {formatCost(itinerary.estimatedCost)}
              </Text>
            </View>

            <View style={styles.metadataItem}>
              <MaterialCommunityIcons name="map-marker-distance" size={20} color="#6B7280" />
              <Text variant="bodyMedium" style={styles.metadataText}>
                {formatDistance(itinerary.distance)}
              </Text>
            </View>

            <View style={styles.metadataItem}>
              <MaterialCommunityIcons name="city" size={20} color="#6B7280" />
              <Text variant="bodyMedium" style={styles.metadataText}>
                {itinerary.city}
              </Text>
            </View>
          </View>

          {/* 🛡️ الحماية هنا: التأكد من وجود ratingSummary أولاً */}
          {itinerary.ratingSummary?.reviewCount > 0 && (
            <View style={styles.ratingContainer}>
              <MaterialCommunityIcons name="star" size={24} color="#F59E0B" />
              <Text variant="titleMedium" style={styles.ratingText}>
                {itinerary.ratingSummary.avgRating.toFixed(1)}
              </Text>
              <Text variant="bodyMedium" style={styles.reviewCount}>
                ({itinerary.ratingSummary.reviewCount} تقييمات)
              </Text>
            </View>
          )}

          {itinerary.notes && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                ملاحظات الرحلة
              </Text>
              <Text variant="bodyMedium" style={styles.notes}>
                {itinerary.notes}
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              الأماكن ({itinerary.places?.length || 0})
            </Text>
            
            {/* 🛡️ الحماية هنا: التأكد من وجود places لتجنب خطأ الماب */}
            {itinerary.places?.map((placeItem, index) => {
              const place = placeItem.placeId as Place;
              if (!place) return null; // حماية إضافية إذا كان المكان محذوفاً

              return (
                <Card key={index} style={styles.placeCard}>
                  <Card.Content>
                    <View style={styles.placeHeader}>
                      <View style={styles.orderBadge}>
                        <Text variant="bodyLarge" style={styles.orderNumber}>
                          {placeItem.order}
                        </Text>
                      </View>
                      <View style={styles.placeInfo}>
                        <Text variant="titleMedium" style={styles.placeName}>
                          {place.name}
                        </Text>
                        <Text variant="bodySmall" style={styles.placeCity}>
                          {place.city}
                        </Text>
                      </View>
                    </View>

                    {place.description && (
                      <Text
                        variant="bodyMedium"
                        style={styles.placeDescription}
                        numberOfLines={2}
                      >
                        {place.description}
                      </Text>
                    )}

                    {placeItem.notes && (
                      <View style={styles.placeNotes}>
                        <MaterialCommunityIcons
                          name="note-text"
                          size={16}
                          color="#6B7280"
                        />
                        <Text variant="bodySmall" style={styles.placeNotesText}>
                          {placeItem.notes}
                        </Text>
                      </View>
                    )}

                    {/* 🛡️ الحماية هنا: التأكد من وجود مصفوفة الكلمات المفتاحية */}
                    {place.categoryTags?.length > 0 && (
                      <View style={styles.tags}>
                        {place.categoryTags.slice(0, 3).map((tag, tagIndex) => (
                          <View key={tagIndex} style={styles.tag}>
                            <Text variant="bodySmall" style={styles.tagText}>
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#6B7280', marginTop: 8 },
  heroImage: { width: '100%', height: 250 },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  title: { flex: 1, fontWeight: 'bold', textAlign: 'left' },
  verifiedIcon: { marginLeft: 8 },
  author: { color: '#6B7280', marginBottom: 16, textAlign: 'left' },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
  metadataItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metadataText: { color: '#6B7280' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 12, backgroundColor: '#FEF3C7', borderRadius: 8 },
  ratingText: { marginLeft: 8, fontWeight: 'bold' },
  reviewCount: { marginLeft: 8, color: '#6B7280' },
  section: { marginTop: 24 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 12, textAlign: 'left' },
  notes: { color: '#374151', lineHeight: 24, textAlign: 'left' },
  placeCard: { marginBottom: 12, elevation: 1 },
  placeHeader: { flexDirection: 'row', marginBottom: 8 },
  orderBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  orderNumber: { color: '#fff', fontWeight: 'bold' },
  placeInfo: { flex: 1 },
  placeName: { fontWeight: 'bold', textAlign: 'left' },
  placeCity: { color: '#6B7280', textAlign: 'left' },
  placeDescription: { color: '#374151', marginBottom: 8, textAlign: 'left' },
  placeNotes: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, padding: 8, backgroundColor: '#F3F4F6', borderRadius: 4 },
  placeNotesText: { flex: 1, color: '#6B7280', textAlign: 'left' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { backgroundColor: '#E0E7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tagText: { color: '#059669' }, // تم تغيير اللون للأخضر الزمردي
});

export default ItineraryDetailScreen;