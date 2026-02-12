#!/bin/bash
cd /opt/mealplanner
git pull
npm install
npx prisma generate
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
chown -R www-data:www-data /opt/mealplanner
systemctl restart mealplanner
echo "Deploy fertig!"
