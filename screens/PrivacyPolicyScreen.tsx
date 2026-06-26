import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PrivacyPolicyScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: June 26, 2026</Text>

        <Text style={styles.heading}>Overview</Text>
        <Text style={styles.body}>
          Air Shooter is designed as an offline arcade game. The game stores settings and paused game
          progress on your device so your audio choices, difficulty, fire rate, score, and resume state
          can be remembered.
        </Text>

        <Text style={styles.heading}>Data Stored On Device</Text>
        <Text style={styles.body}>
          The app may save sound settings, music settings, gameplay settings, a paused score, and simple
          game state values using local device storage. This information is not sent to a server by the app.
        </Text>

        <Text style={styles.heading}>Personal Information</Text>
        <Text style={styles.body}>
          The app does not ask for your name, email address, contacts, location, photos, or account login.
        </Text>

        <Text style={styles.heading}>Audio</Text>
        <Text style={styles.body}>
          The app plays bundled sound effects and background music. Audio settings can be changed from the
          settings screen at any time.
        </Text>

        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.body}>
          For privacy questions, contact the developer through the app store listing where you downloaded
          the game.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070d',
  },
  header: {
    paddingTop: 44,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backButton: {
    position: 'absolute',
    left: 18,
    top: 42,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 2,
  },
  backText: {
    color: '#fff',
    fontWeight: '700',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  updated: {
    color: '#8ab8d8',
    fontSize: 13,
    marginBottom: 18,
  },
  heading: {
    color: '#7fd4ff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 8,
  },
  body: {
    color: '#e8f0ff',
    fontSize: 15,
    lineHeight: 22,
  },
});
