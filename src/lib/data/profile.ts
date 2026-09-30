/**
 * Vragen die iedereen (ook 't Duvelke) bij het begin over zichzelf beantwoordt.
 * Windy roddelt hierover, en in De Test komen ze terug ("Welke kleur t-shirt heeft 't Duvelke?").
 */

export interface ProfileOption {
  value: string;
  label: string;
  emoji?: string;
  swatch?: string;
}

export interface ProfileQuestion {
  id: string;
  question: string;
  /** Voor roddels en de test; {saboteur} wordt ingevuld. */
  about: string;
  options: ProfileOption[];
}

export const PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    id: 'bovenstuk',
    question: 'Welke kleur heeft je t-shirt, trui of kleedje?',
    about: 'de kleur van de kleren van {saboteur}',
    options: [
      { value: 'rood', label: 'Rood', swatch: '#e53935' },
      { value: 'oranje', label: 'Oranje', swatch: '#fb8c00' },
      { value: 'geel', label: 'Geel', swatch: '#fdd835' },
      { value: 'groen', label: 'Groen', swatch: '#43a047' },
      { value: 'blauw', label: 'Blauw', swatch: '#1e88e5' },
      { value: 'paars', label: 'Paars', swatch: '#8e24aa' },
      { value: 'roze', label: 'Roze', swatch: '#f06292' },
      { value: 'wit', label: 'Wit', swatch: '#f5f5f5' },
      { value: 'zwart', label: 'Zwart', swatch: '#212121' },
      { value: 'grijs', label: 'Grijs', swatch: '#9e9e9e' },
      { value: 'bruin', label: 'Bruin / beige', swatch: '#8d6e63' },
      { value: 'veelkleurig', label: 'Veel kleuren', swatch: 'linear-gradient(135deg,#e53935,#fdd835,#43a047,#1e88e5)' },
    ],
  },
  {
    id: 'onderstuk',
    question: 'Wat draag je onderaan?',
    about: 'wat {saboteur} onderaan draagt',
    options: [
      { value: 'lange-broek', label: 'Lange broek', emoji: '👖' },
      { value: 'korte-broek', label: 'Korte broek', emoji: '🩳' },
      { value: 'rok', label: 'Rok of kleedje', emoji: '👗' },
      { value: 'legging', label: 'Legging', emoji: '🦵' },
    ],
  },
  {
    id: 'bril',
    question: 'Draag je een bril?',
    about: 'of {saboteur} een bril draagt',
    options: [
      { value: 'ja', label: 'Ja', emoji: '👓' },
      { value: 'nee', label: 'Nee', emoji: '🙂' },
    ],
  },
  {
    id: 'haarlengte',
    question: 'Hoe lang is je haar?',
    about: 'hoe lang het haar van {saboteur} is',
    options: [
      { value: 'kort', label: 'Kort', emoji: '👦' },
      { value: 'halflang', label: 'Tot aan mijn schouders', emoji: '🧒' },
      { value: 'lang', label: 'Lang', emoji: '👧' },
    ],
  },
  {
    id: 'haarkleur',
    question: 'Welke kleur heeft je haar?',
    about: 'de haarkleur van {saboteur}',
    options: [
      { value: 'blond', label: 'Blond', swatch: '#f1d17a' },
      { value: 'bruin', label: 'Bruin', swatch: '#7b4a2a' },
      { value: 'zwart', label: 'Zwart', swatch: '#1b1b1b' },
      { value: 'rood', label: 'Rood', swatch: '#c1502e' },
      { value: 'grijs', label: 'Grijs of wit', swatch: '#cfcfcf' },
    ],
  },
  {
    id: 'schoenen',
    question: 'Wat heb je aan je voeten?',
    about: 'wat {saboteur} aan de voeten heeft',
    options: [
      { value: 'witte-schoenen', label: 'Witte schoenen', emoji: '👟' },
      { value: 'donkere-schoenen', label: 'Donkere schoenen', emoji: '👞' },
      { value: 'kleurige-schoenen', label: 'Kleurige schoenen', emoji: '🥿' },
      { value: 'laarzen', label: 'Laarzen', emoji: '🥾' },
      { value: 'sokken', label: 'Sokken of pantoffels', emoji: '🧦' },
    ],
  },
  {
    id: 'broerzus',
    question: 'Heb je een broer of zus?',
    about: 'of {saboteur} een broer of zus heeft',
    options: [
      { value: 'broer', label: 'Een broer (of meer)', emoji: '👦' },
      { value: 'zus', label: 'Een zus (of meer)', emoji: '👧' },
      { value: 'allebei', label: 'Allebei', emoji: '👫' },
      { value: 'geen', label: 'Nee', emoji: '🙅' },
    ],
  },
  {
    id: 'eten',
    question: 'Wat eet je het allerliefst?',
    about: 'het lievelingseten van {saboteur}',
    options: [
      { value: 'frietjes', label: 'Frietjes', emoji: '🍟' },
      { value: 'pizza', label: 'Pizza', emoji: '🍕' },
      { value: 'pannenkoeken', label: 'Pannenkoeken', emoji: '🥞' },
      { value: 'spaghetti', label: 'Spaghetti', emoji: '🍝' },
      { value: 'iets-anders', label: 'Iets anders', emoji: '🍽️' },
    ],
  },
];
