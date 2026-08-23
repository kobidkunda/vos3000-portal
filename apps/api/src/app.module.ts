import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { RatesController } from "./rates.controller.js";
import { AuthService } from "./auth.service.js";
import { DevicesSetupController } from "./devices-setup/controller.js";
import { DevicesSetupService } from "./devices-setup/service.js";
import { PlatformService } from "./platform.service.js";
import { DataSourcesService } from "./data-sources.service.js";
import { RateManagementService } from "./rate-management.service.js";
import { NowpaymentsService } from "./nowpayments.service.js";
import { SupportService } from "./support/support.service.js";

@Module({
  controllers: [AppController, RatesController, DevicesSetupController],
  providers: [AuthService, PlatformService, DataSourcesService, RateManagementService, NowpaymentsService, DevicesSetupService, SupportService],
  exports: [AuthService, PlatformService, DataSourcesService, RateManagementService, NowpaymentsService, SupportService]
})
export class AppModule {}
