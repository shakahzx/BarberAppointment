const bcrypt = require('bcryptjs');
const Barber = require('../models/Barber');
const Service = require('../models/Service');
const User = require('../models/User');

async function seedDefaults() {
  const email = 'admin@barber.com';
  const existingAdmin = await User.findOne({ email });
  if (!existingAdmin) {
    const password = await bcrypt.hash('Admin123!', 12);
    await User.create({ name: 'Administrator', email, password, role: 'admin', isEmailVerified: true });
    console.log(`Default administrator created: ${email}`);
  }

  if (await Service.countDocuments() === 0) {
    await Service.insertMany([
      { name: 'Haircut', description: 'A clean, tailored cut finished with a hot towel.', price: 150, duration: 30 },
      { name: 'Haircut + Beard', description: 'A precision haircut with a detailed beard trim.', price: 250, duration: 45 },
      { name: 'Haircut + Hair Wash', description: 'A fresh cut followed by a relaxing wash.', price: 200, duration: 40 },
    ]);
  }

  if (await Barber.countDocuments() === 0) {
    await Barber.create({
      name: 'Alex Morgan',
      specialties: ['Classic cuts', 'Beard styling'],
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      startTime: '09:00',
      endTime: '18:00',
    });
  }
}

module.exports = seedDefaults;