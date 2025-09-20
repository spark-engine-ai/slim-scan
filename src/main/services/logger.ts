import { app } from 'electron';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private logFile: string;
  private maxLines = 1000;
  private level: LogLevel = LogLevel.INFO;

  constructor() {
    this.logFile = join(app.getPath('userData'), 'slimscan.log');
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] ${level}: ${message}${dataStr}`;
  }

  private writeToFile(message: string): void {
    try {
      let content = '';
      
      if (existsSync(this.logFile)) {
        content = readFileSync(this.logFile, 'utf8');
      }
      
      const lines = content ? content.split('\n') : [];
      lines.push(message);
      
      // Keep only the last maxLines
      if (lines.length > this.maxLines) {
        lines.splice(0, lines.length - this.maxLines);
      }
      
      writeFileSync(this.logFile, lines.join('\n'));
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  error(message: string, data?: any): void {
    if (this.level >= LogLevel.ERROR) {
      const formatted = this.formatMessage('ERROR', message, data);
      console.error(formatted);
      this.writeToFile(formatted);
    }
  }

  warn(message: string, data?: any): void {
    if (this.level >= LogLevel.WARN) {
      const formatted = this.formatMessage('WARN', message, data);
      console.warn(formatted);
      this.writeToFile(formatted);
    }
  }

  info(message: string, data?: any): void {
    if (this.level >= LogLevel.INFO) {
      const formatted = this.formatMessage('INFO', message, data);
      console.info(formatted);
      this.writeToFile(formatted);
    }
  }

  debug(message: string, data?: any): void {
    if (this.level >= LogLevel.DEBUG) {
      const formatted = this.formatMessage('DEBUG', message, data);
      console.debug(formatted);
      this.writeToFile(formatted);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

export const logger = new Logger();

export async function getLogs(): Promise<string[]> {
  try {
    const logFile = join(app.getPath('userData'), 'slimscan.log');
    if (!existsSync(logFile)) {
      return [];
    }
    
    const content = readFileSync(logFile, 'utf8');
    return content.split('\n').filter(line => line.trim().length > 0).slice(-100);
  } catch (error) {
    console.error('Failed to read logs:', error);
    return ['Failed to read logs'];
  }
}