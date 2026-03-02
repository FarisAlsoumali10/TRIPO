import React from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { itineraryAPI } from '../../services/api';
import { Itinerary } from '../../types';
import { HomeStackParamList } from '../../navigation/types';
import ItineraryCard from './ItineraryCard';

type ForYouFeedNavigationProp = StackNavigationProp<HomeStackParamList, 'HomeMain'>;

const PRIMARY_EMERALD = '#059669';

const ForYouFeed = () => {
  const navigation = useNavigation<ForYouFeedNavigationProp>();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['itineraries', 'feed'],
    queryFn: ({ pageParam = 1 }) => itineraryAPI.getFeed(pageParam, 20),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  const itineraries: Itinerary[] = data?.pages.flatMap((page) => page.data) ?? [];

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderItem = ({ item }: { item: Itinerary }) => (
    <ItineraryCard
      itinerary={item}
      onPress={() => navigation.navigate('ItineraryDetail', { id: item._id })}
    />
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={PRIMARY_EMERALD} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text variant="headlineSmall" style={styles.emptyTitle}>
          لم نجد رحلات تناسبك حالياً 🧐
        </Text>
        <Text variant="bodyMedium" style={styles.emptyText}>
          أكمل ملفك الذكي وحدد اهتماماتك لنقوم باقتراح أفضل الرحلات المخصصة لك!
        </Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('Profile' as any)}
          style={styles.emptyButton}
          buttonColor={PRIMARY_EMERALD}
        >
          إكمال الملف الذكي ✨
        </Button>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_EMERALD} />
        <Text style={styles.loadingText}>جاري تحضير أجمل الرحلات...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="titleMedium" style={styles.errorTitle}>
          عذراً، تعذر تحميل الاقتراحات 
        </Text>
        <Text variant="bodyMedium" style={styles.errorText}>
          يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى
        </Text>
        <Button mode="outlined" onPress={() => refetch()} textColor={PRIMARY_EMERALD} style={styles.retryButton}>
          إعادة المحاولة
        </Button>
      </View>
    );
  }

  return (
    <FlatList
      data={itineraries}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.listContent}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[PRIMARY_EMERALD]}
          tintColor={PRIMARY_EMERALD}
        />
      }
      maxToRenderPerBatch={10}
      windowSize={10}
      removeClippedSubviews={true}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    borderColor: PRIMARY_EMERALD,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 80,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
});

export default ForYouFeed;