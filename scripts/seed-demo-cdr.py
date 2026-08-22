import json,random,datetime,sys
for i in range(1000):
 t=datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(seconds=i*17)
 print(json.dumps({"serial_number":f"demo-{i}","vos_instance_id":"demo","customer_id":"cus_acme","account_id":"VOS-5001","caller":f"+1415555{1000+i%9000:04d}","callee":f"+4420718{2000+i%7000:04d}","mapping_gateway_id":f"GW-{1+i%4}","routing_gateway_id":f"RG-{1+i%6}","begin_time":t.isoformat(),"end_time":(t+datetime.timedelta(seconds=random.randint(5,300))).isoformat(),"duration":random.randint(5,300),"charged_duration":random.randint(5,300),"customer_charge":f"{random.random():.4f}","carrier_cost":f"{random.random()/2:.4f}","pdd_ms":random.randint(80,1200),"termination_reason":"" if i%8 else "SIP 503"}))
