/**
 * Service de calcul des commissions
 * Centralise la logique métier des commissions pour éviter les duplications
 */

export interface CommissionBreakdown {
  driver: number;
  app: number;
  restaurant: number;
}

export class CommissionService {
  /**
   * Commission fixe pour le livreur (en TND)
   */
  private static readonly DRIVER_COMMISSION = 2.5;

  /**
   * Commission fixe pour l'application (en TND)
   */
  private static readonly APP_COMMISSION = 1.5;

  /**
   * Calcule les commissions pour une commande avec les montants par défaut
   * @param totalPrice Prix total de la commande
   * @returns Répartition des commissions
   */
  static calculateCommissions(totalPrice: number | string): CommissionBreakdown {
    const total = Number(totalPrice);
    const driver = this.DRIVER_COMMISSION;
    const app = this.APP_COMMISSION;
    const restaurant = total - driver - app;

    return {
      driver,
      app,
      restaurant: Number(restaurant.toFixed(2)),
    };
  }

  /**
   * Calcule les commissions avec des montants personnalisés
   * @param totalPrice Prix total de la commande
   * @param driverCommission Commission du livreur (optionnel, utilise la valeur par défaut si non fournie)
   * @param appCommission Commission de l'application (optionnel, utilise la valeur par défaut si non fournie)
   * @returns Répartition des commissions
   */
  static calculateFromCustom(
    totalPrice: number | string,
    driverCommission?: number,
    appCommission?: number
  ): CommissionBreakdown {
    const total = Number(totalPrice);
    const driver = driverCommission !== undefined ? Number(driverCommission) : this.DRIVER_COMMISSION;
    const app = appCommission !== undefined ? Number(appCommission) : this.APP_COMMISSION;
    
    // Validation: s'assurer que les commissions ne dépassent pas le total
    if (driver + app > total) {
      throw new Error(`Les commissions (${driver + app}) dépassent le total (${total})`);
    }
    
    const restaurant = total - driver - app;

    return {
      driver,
      app,
      restaurant: Number(restaurant.toFixed(2)),
    };
  }

  /**
   * Retourne les montants de commission par défaut
   */
  static getDefaultCommissions(): { driver: number; app: number } {
    return {
      driver: this.DRIVER_COMMISSION,
      app: this.APP_COMMISSION,
    };
  }
}

