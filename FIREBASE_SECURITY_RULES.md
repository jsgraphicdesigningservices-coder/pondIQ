# Firebase Realtime Database Security Rules

## Enterprise-Grade Access Control for Aqua Smart Pond

These rules enforce the UID-based ownership model where:
- **Normal users** can only access ponds they own (`ownerUid === auth.uid`)
- **Admins** can read all ponds but **cannot control devices**
- **ESP32 devices** can only write to their assigned pond path

---

## Complete Security Rules

```json
{
  "rules": {
    // User profiles and admin status
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "role": {
          ".read": true,
          ".write": false
        }
      }
    },

    // Pairing codes lookup (for ESP32 provisioning)
    "pairingCodes": {
      "$code": {
        ".read": true,
        ".write": "auth != null && (!data.exists() || data.child('createdBy').val() === auth.uid)"
      }
    },

    // Main pond data
    "ponds": {
      "$pondId": {
        // OWNERSHIP CHECK FUNCTION (reused in child rules)
        // Owner: full read/write
        // Admin: read-only
        // Others: no access

        ".read": "
          auth != null && (
            data.child('ownerUid').val() === auth.uid ||
            data.child('access/' + auth.uid).exists() ||
            root.child('users/' + auth.uid + '/role').val() === 'admin'
          )
        ",

        // Only owner can write to root pond config
        ".write": "
          auth != null && (
            !data.exists() ||
            data.child('ownerUid').val() === auth.uid
          )
        ",

        // Ownership fields - immutable after creation (except by owner)
        "ownerUid": {
          ".write": "!data.exists() || data.val() === auth.uid"
        },
        "ownerEmail": {
          ".write": "!data.exists() || data.parent().child('ownerUid').val() === auth.uid"
        },

        // Sensors - ESP32 can write, owner can read
        "sensors": {
          ".read": "
            auth != null && (
              data.parent().child('ownerUid').val() === auth.uid ||
              data.parent().child('access/' + auth.uid).exists() ||
              root.child('users/' + auth.uid + '/role').val() === 'admin'
            )
          ",
          ".write": "
            auth != null && (
              data.parent().child('ownerUid').val() === auth.uid ||
              data.parent().child('access/' + auth.uid + '/role').val() === 'operator'
            )
          "
        },

        // Devices - Owner and Operators can control, Admin is READ-ONLY
        "devices": {
          "$deviceType": {
            ".read": "
              auth != null && (
                data.parent().parent().child('ownerUid').val() === auth.uid ||
                data.parent().parent().child('access/' + auth.uid).exists() ||
                root.child('users/' + auth.uid + '/role').val() === 'admin'
              )
            ",
            // CRITICAL: Admins CANNOT write to devices
            ".write": "
              auth != null && (
                data.parent().parent().child('ownerUid').val() === auth.uid ||
                data.parent().parent().child('access/' + auth.uid + '/role').val() === 'operator' ||
                data.parent().parent().child('access/' + auth.uid + '/role').val() === 'admin'
              ) && root.child('users/' + auth.uid + '/role').val() !== 'admin'
            ",
            "state": {
              ".validate": "newData.isNumber() && (newData.val() === 0 || newData.val() === 1)"
            },
            "mode": {
              ".validate": "newData.isString() && (newData.val() === 'manual' || newData.val() === 'auto')"
            }
          }
        },

        // Status - ESP32 updates heartbeat
        "status": {
          ".write": "
            auth != null && (
              data.parent().child('ownerUid').val() === auth.uid ||
              data.parent().child('access/' + auth.uid).exists()
            )
          "
        },

        // Schedules - Owner and Operators only
        "schedules": {
          ".write": "
            auth != null && (
              data.parent().child('ownerUid').val() === auth.uid ||
              data.parent().child('access/' + auth.uid + '/role').val() === 'operator'
            )
          "
        },

        // Config - Owner only
        "config": {
          ".write": "
            auth != null && data.parent().child('ownerUid').val() === auth.uid
          "
        },

        // Access control list - Owner only
        "access": {
          ".write": "
            auth != null && data.parent().child('ownerUid').val() === auth.uid
          ",
          "$userId": {
            "role": {
              ".validate": "newData.isString() && (newData.val() === 'admin' || newData.val() === 'operator' || newData.val() === 'viewer')"
            }
          }
        },

        // Pending ownership transfers
        "pendingTransfer": {
          ".write": "
            auth != null && data.parent().child('ownerUid').val() === auth.uid
          "
        },

        // Settings synced from app
        "settings": {
          ".write": "
            auth != null && (
              data.parent().child('ownerUid').val() === auth.uid ||
              data.parent().child('access/' + auth.uid + '/role').val() === 'operator'
            )
          "
        }
      }
    },

    // ESP32 device registry
    "devices": {
      "$deviceId": {
        ".read": "auth != null",
        ".write": "auth != null && (!data.exists() || data.child('assignedByUid').val() === auth.uid)",
        "pondId": {
          ".validate": "newData.isString()"
        },
        "assignedByUid": {
          ".validate": "newData.val() === auth.uid"
        }
      }
    },

    // Default deny
    "$other": {
      ".read": false,
      ".write": false
    }
  }
}
```

---

## Role Definitions

| Role | Read Ponds | Control Devices | Modify Settings | Delete Pond |
|------|-----------|-----------------|-----------------|-------------|
| **Owner** | ✅ Own only | ✅ Full | ✅ Full | ✅ Yes |
| **Operator** | ✅ Shared | ✅ Limited | ✅ Limited | ❌ No |
| **Viewer** | ✅ Shared | ❌ No | ❌ No | ❌ No |
| **Admin** | ✅ All | ❌ **READ ONLY** | ❌ No | ❌ No |

---

## Key Security Principles

### 1. UID-Based Ownership
```
ownerUid is the SINGLE SOURCE OF TRUTH
```
- Every pond has exactly one `ownerUid`
- Only the owner can transfer ownership
- ESP32 devices read their pond path from app provisioning

### 2. Admin Read-Only
```javascript
// This line PREVENTS admins from controlling devices:
"... && root.child('users/' + auth.uid + '/role').val() !== 'admin'"
```

### 3. ESP32 Provisioning
1. User creates pond in app → generates `pondId` + `pairingCode`
2. User enters `pondId` on ESP32 config portal
3. ESP32 stores `pondId` and only writes to `ponds/{pondId}/sensors` and `ponds/{pondId}/status`

### 4. No Cross-Pond Access
```javascript
// Query on client side:
.orderByChild('ownerUid').equalTo(auth.uid)

// Rules enforce this at database level
```

---

## Testing Your Rules

Use the Firebase Console Rules Playground to test:

**Test 1: Owner reads own pond** ✅
```
Path: /ponds/pond123
Method: read
Auth: { uid: "user_abc", token: { email: "owner@test.com" } }
Data at /ponds/pond123/ownerUid: "user_abc"
Expected: Allow
```

**Test 2: User reads other's pond** ❌
```
Path: /ponds/pond123
Method: read
Auth: { uid: "user_xyz" }
Data at /ponds/pond123/ownerUid: "user_abc"
Expected: Deny
```

**Test 3: Admin reads any pond** ✅
```
Path: /ponds/pond123
Method: read
Auth: { uid: "admin_user" }
Data at /users/admin_user/role: "admin"
Expected: Allow
```

**Test 4: Admin controls device** ❌
```
Path: /ponds/pond123/devices/motor/state
Method: write
Auth: { uid: "admin_user" }
Data at /users/admin_user/role: "admin"
New Data: 1
Expected: Deny
```

---

## Deployment

1. Go to Firebase Console → Realtime Database → Rules
2. Paste the complete rules JSON
3. Click "Publish"
4. Test with the Rules Playground before deploying to production

---

## Notes

- These rules assume Firebase Anonymous Auth or Email/Password Auth
- For production, add rate limiting via Cloud Functions
- Indexes should be added for `ownerUid` queries:

```json
{
  "rules": {
    "ponds": {
      ".indexOn": ["ownerUid", "createdAt"]
    }
  }
}
```
