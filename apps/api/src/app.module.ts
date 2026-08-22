import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { RatesController } from "./rates.controller.js";
import { AuthService } from "./auth.service.js";
import { PlatformService } from "./platform.service.js";
import { DataSourcesService } from "./data-sources.service.js";
import { RateManagementService } from "./rate-management.service.js";
import { NowpaymentsService } from "./nowpayments.service.js";

@Module({
  controllers: [AppController, RatesController],
  providers: [AuthService, PlatformService, DataSourcesService, RateManagementService, NowpaymentsService],
  exports: [AuthService, PlatformService, DataSourcesService, RateManagementService, NowpaymentsService]
})
export class AppModule {}
