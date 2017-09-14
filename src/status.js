/**
 * Status plugin that will report info about current service
 * every `statusReportInterval` milliseconds
 */
const StatusPlugin = {
  // Reference to autoreport interval
  statusReportIntervalRef: null,
  // Interval to send keep-alive status messages
  statusReportInterval: 60000,
  // Status report data
  statusReportData: null,
  // Sends keep-alive message
  reportStatus() {
    this.send('microcore.service', this.statusReportData, {expiration: this.statusReportInterval, persistent: false});
  },

  // Inits autoreport of status, will dispatch keep-alive messages using given interval
  autoreportStatus(data) {
    this.stopAutoreportStatus();
    this.statusReportData = data;
    this.statusReportIntervalRef = setInterval(() => this.reportStatus(), this.statusReportInterval);
    this.reportStatus();
  },

  // Stops autoreporting status
  stopAutoreportStatus() {
    if (this.statusReportIntervalRef) {
      clearInterval(this.statusReportIntervalRef);
      delete this.statusReportIntervalRef;
      delete this.statusReportData;
    }
  },
};

module.exports = StatusPlugin;
