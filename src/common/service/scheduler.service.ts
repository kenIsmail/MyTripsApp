import { Agenda } from '@hokify/agenda';
import debug from 'debug';

import mongooseService from './mongoose.service';
import tripsService from '../../trips/services/trips.service';
import ticketsService from '../../tickets/services/tickets.service';

const log: debug.IDebugger = debug('app:scheduler-service');

class SchedulerService {
  private agenda: Agenda;

  constructor() {
    this.agenda = new Agenda({
      db: { address: mongooseService.DB_URI },
    });

    this.initAgenda();
  }

  /**
   * Initializes the agenda and defines the job functions for trip status and ticket status updates.
   * @returns A promise that resolves when the agenda is successfully started.
   */
  private async initAgenda(): Promise<void> {
    this.agenda.define(`tripStatusJob`, async (job) => {
      try {
        tripsService.updateTripStatus(job.attrs.data.tripId);
      } catch (error) {
        throw error;
      }
    });

    this.agenda.define(`ticketStatusJob`, async (job) => {
      try {
        ticketsService.updateTicketStatusByTrip(job.attrs.data.tripId);
      } catch (error) {
        throw error;
      }
    });

    this.agenda.on('success', (job) => {
      job.remove();
    });

    await this.agenda.start();
  }

  /**
   * Schedules status update for a trip.
   * @param tripId - The ID of the trip.
   * @param arrivalTime - The arrival time for the trip.
   * @returns A promise that resolves when the status update is scheduled.
   * @throws If there is an error scheduling the status update.
   */
  public async scheduleStatusUpdate(
    tripId: string,
    arrivalTime: Date
  ): Promise<void> {
    try {
      await this.agenda.schedule(arrivalTime, 'tripStatusJob', { tripId });
      await this.agenda.schedule(arrivalTime, 'ticketStatusJob', { tripId });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Updates the scheduled time for a trip and reschedules related jobs.
   * @param tripId - The ID of the trip.
   * @param arrivalTime - The new arrival time for the trip.
   * @returns A Promise that resolves when the update is complete.
   * @throws If there is an error updating the scheduled time.
   */
  public async updateScheduledTime(
    tripId: string,
    arrivalTime: Date
  ): Promise<void> {
    try {
      await this.agenda.cancel({
        name: 'tripStatusJob',
        'data.tripId': tripId,
      });

      await this.agenda.cancel({
        name: 'ticketStatusJob',
        'data.tripId': tripId,
      });

      await this.agenda.schedule(arrivalTime, 'ticketStatusJob', { tripId });
      await this.agenda.schedule(arrivalTime, 'tripStatusJob', { tripId });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancels the scheduled time for a trip.
   * @param tripId - The ID of the trip.
   * @returns A Promise that resolves when the scheduled time is successfully canceled.
   * @throws If there is an error while canceling the scheduled time.
   */
  public async cancelScheduledTime(tripId: string): Promise<void> {
    try {
      await this.agenda.cancel({
        name: 'tripStatusJob',
        'data.tripId': tripId,
      });

      await this.agenda.cancel({
        name: 'ticketStatusJob',
        'data.tripId': tripId,
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new SchedulerService();
export { SchedulerService };
