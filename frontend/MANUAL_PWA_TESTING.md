# Manual PWA Testing Guide - Subtask 13.4

## 🎯 **Manual Testing Steps for PWA Installation and Offline Functionality**

### **✅ Automated Tests Completed**
All automated tests have passed:
- ✅ Server running on port 4173
- ✅ PWA Manifest loaded successfully
- ✅ Offline page accessible
- ✅ All build files present
- ✅ Service worker properly configured

---

## **🌐 Chrome PWA Testing (Primary)**

### **1. Open PWA in Chrome**
- Navigate to: `http://localhost:4173`
- Verify the Solar Panel Tracker loads correctly

### **2. Check PWA Install Prompt**
- Look for install button in address bar (📱 icon)
- Look for install option in Chrome menu (⋮ → Install Solar Panel Tracker)
- If not visible, check DevTools > Application > Manifest

### **3. Install PWA**
- Click install button/prompt
- Verify installation completes
- Check if app appears in:
  - Desktop app launcher
  - Chrome apps page (`chrome://apps/`)
  - Start menu (Windows) or Applications folder (Mac)

### **4. Test PWA Launch**
- Launch app from installed location
- Verify app opens independently of Chrome
- Check if app has proper window controls

---

## **🔧 Service Worker Testing**

### **1. Open DevTools**
- Press `F12` or right-click → Inspect
- Go to **Application** tab → **Service Workers**

### **2. Verify Service Worker**
- Should show status: "activated and running"
- Check "Update on reload" if needed
- Verify service worker file: `sw.js`

### **3. Check Cache Storage**
- Go to **Application** → **Cache Storage**
- Should show multiple caches:
  - `api-cache`
  - `static-assets-cache`
  - `images-cache`
  - `fonts-cache`
  - `html-cache`
  - `offline-cache`

---

## **🔌 Offline Functionality Testing**

### **1. Test Offline Page**
- Navigate to: `http://localhost:4173/offline.html`
- Verify offline page displays correctly
- Check retry button functionality

### **2. Simulate Offline Mode**
- In DevTools → **Network** tab
- Check "Offline" checkbox
- Refresh the main app page
- Verify offline experience works

### **3. Test Offline Navigation**
- With offline mode enabled:
  - Navigate between Dashboard, Scan, Inspections, Settings
  - Verify previously visited pages load from cache
  - Check if offline.html shows for new pages

### **4. Test Cache Strategies**
- **API calls**: Should fallback to cache after 10 seconds
- **Static assets**: Should load instantly from cache
- **Images**: Should load from cache with background refresh
- **HTML pages**: Should fallback to cache after 5 seconds

---

## **📱 Mobile/Responsive Testing**

### **1. Chrome DevTools Device Simulation**
- Open DevTools → **Toggle device toolbar** (📱 icon)
- Test different device sizes:
  - iPhone SE (375x667)
  - iPhone 12 Pro (390x844)
  - iPad (768x1024)
  - Desktop (1200x800)

### **2. Touch Interface Testing**
- Verify all buttons are touch-friendly (44px minimum)
- Test navigation gestures
- Check responsive design adaptation

### **3. PWA Installation on Mobile**
- Use Chrome on mobile device
- Navigate to `http://localhost:4173`
- Look for "Add to Home Screen" prompt
- Verify app installs to home screen

---

## **🔄 Update Testing**

### **1. Service Worker Updates**
- Make a small change to the app
- Rebuild with `npm run build`
- Refresh the page
- Check if new service worker is detected
- Verify update notification appears

### **2. Cache Versioning**
- Check if old caches are cleaned up
- Verify new assets are cached properly
- Test that app continues working during updates

---

## **📊 Performance Testing**

### **1. Lighthouse Audit**
- Open DevTools → **Lighthouse** tab
- Run audit for:
  - Performance
  - Progressive Web App
  - Best Practices
  - Accessibility

### **2. Loading Performance**
- **First Load**: Should complete within 3 seconds
- **Subsequent Loads**: Should be nearly instant
- **Offline Load**: Should work without network

### **3. Bundle Analysis**
- Check bundle sizes in DevTools → **Network**
- Verify code splitting works
- Check if tree shaking removed unused code

---

## **🐛 Error Handling Testing**

### **1. Network Errors**
- Simulate slow network (DevTools → Network → Slow 3G)
- Test timeout behaviors
- Verify fallback to cache works

### **2. Offline Recovery**
- Enable offline mode
- Navigate around the app
- Disable offline mode
- Verify app recovers properly
- Check if data syncs correctly

---

## **✅ Testing Checklist**

### **PWA Installation**
- [ ] Install prompt appears in Chrome
- [ ] Installation completes successfully
- [ ] App launches independently
- [ ] App appears in app launcher

### **Service Worker**
- [ ] Service worker registers correctly
- [ ] All cache strategies work
- [ ] Cache cleanup functions
- [ ] Update mechanism works

### **Offline Functionality**
- [ ] Offline page displays correctly
- [ ] Cached content accessible offline
- [ ] Navigation works offline
- [ ] App recovers when online

### **Performance**
- [ ] App loads within 3 seconds
- [ ] Offline-first experience works
- [ ] Bundle size reasonable
- [ ] Code splitting effective

---

## **📝 Test Results**

### **Overall Status**
- **Chrome PWA Installation**: [ ] PASS / [ ] FAIL
- **Service Worker**: [ ] PASS / [ ] FAIL
- **Offline Functionality**: [ ] PASS / [ ] FAIL
- **Performance**: [ ] PASS / [ ] FAIL

### **Issues Found**
- [ ] Issue 1: [Description]
- [ ] Issue 2: [Description]

### **Next Steps**
- [ ] Complete manual testing
- [ ] Fix any identified issues
- [ ] Re-test failed scenarios
- [ ] Mark subtask as complete

---

## **🚀 Quick Test Commands**

```bash
# Build project
npm run build

# Start preview server
npm run preview

# Run automated tests
node test-pwa.cjs

# Open in Chrome
open -a "Google Chrome" http://localhost:4173
```

---

## **💡 Testing Tips**

1. **Use Chrome DevTools** for comprehensive testing
2. **Test on multiple devices** if possible
3. **Document any browser-specific behavior**
4. **Note performance metrics** for optimization
5. **Record user experience observations**
6. **Test edge cases** (slow network, offline, etc.)
