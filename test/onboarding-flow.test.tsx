import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from './test-utils';
import userEvent from '@testing-library/user-event';
import OnboardingPage from '@/pages/onboarding';
import * as api from '@/lib/api';

// Mock de l'API (on simule les réponses serveur)
vi.mock('@/lib/api', () => ({
  sendOtp: vi.fn(() => Promise.resolve({ code: '1234' })),
  verifyOtp: vi.fn(() => Promise.resolve({ verified: true })),
}));

describe('Onboarding Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should display phone step initially', () => {
    render(<OnboardingPage />);
    expect(screen.getByText(/ton numéro|téléphone/i)).toBeInTheDocument();
  });

  it('should send OTP when name and phone are filled', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    // Remplir le nom
    const nameInput = screen.getByPlaceholderText(/prénom/i);
    await user.type(nameInput, 'Raoua');

    // Remplir le téléphone
    const phoneInput = screen.getByPlaceholderText(/216/i);
    await user.type(phoneInput, '21123456');

    // Cliquer sur "Recevoir un code"
    const sendBtn = screen.getByText(/recevoir un code/i);
    await user.click(sendBtn);

    // Vérifier que l'API a été appelée
    await waitFor(() => {
      expect(api.sendOtp).toHaveBeenCalledWith('21123456');
    });

    // Vérifier qu'on passe à l'étape OTP
    await waitFor(() => {
      expect(screen.getByText(/code|SMS/i)).toBeInTheDocument();
    });
  });

  it('should verify OTP and move to location step', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    // Étape 1: Nom + Téléphone
    const nameInput = screen.getByPlaceholderText(/prénom/i);
    await user.type(nameInput, 'Raoua');

    const phoneInput = screen.getByPlaceholderText(/216/i);
    await user.type(phoneInput, '21123456');

    await user.click(screen.getByText(/recevoir un code/i));

    // Attendre l'étape OTP
    await waitFor(() => {
      expect(screen.getByText(/code|SMS/i)).toBeInTheDocument();
    });

    // Étape 2: OTP - chercher l'input par type tel
    const allInputs = screen.getAllByRole('textbox');
    const otpInput = allInputs.find(input => {
      const el = input as HTMLInputElement;
      return el.type === 'tel' && el.maxLength === 4;
    }) as HTMLInputElement;

    if (otpInput) {
      await user.type(otpInput, '1234');
      await user.click(screen.getByText(/confirmer/i));

      // Vérifier que l'API verifyOtp a été appelée
      await waitFor(() => {
        expect(api.verifyOtp).toHaveBeenCalledWith('21123456', '1234');
      });

      // Vérifier qu'on passe à l'étape localisation (plusieurs éléments contiennent "livrer")
      await waitFor(() => {
        expect(screen.getByText(/où doit-on livrer/i)).toBeInTheDocument();
      });
    }
  });
});
